
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { CabinetSpecs, DesignResult, AppStatus } from './types';

const STYLES = ['مدرن', 'کلاسیک', 'نئوکلاسیک', 'مینیمال', 'ایرانی', 'لوکس'];
const MATERIALS = ['MDF', 'هایگلاس', 'ممبران', 'چوب طبیعی', 'پولیشی'];

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<DesignResult | null>(null);
  const [specs, setSpecs] = useState<CabinetSpecs>({
    style: 'مدرن',
    color: '',
    material: 'MDF',
    handleType: 'مخفی (G-Handle)',
    hasIsland: false,
    cabinetType: 'معمولی',
    extraNotes: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const processDesign = async () => {
    if (!image) return alert('لطفاً عکس آشپزخانه را بارگذاری کنید.');
    
    setStatus(AppStatus.LOADING_IMAGE);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const base64Data = image.split(',')[1];

      // ۱. تولید تصویر بازطراحی شده
      const imgResp = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
            { text: `Redesign these kitchen cabinets. Style: ${specs.style}, Material: ${specs.material}. Keep the room structure identical. Realistic architectural photography.` }
          ]
        }
      });

      let redesignedUrl = '';
      for (const part of imgResp.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) redesignedUrl = `data:image/png;base64,${part.inlineData.data}`;
      }

      // ۲. تولید نقشه فنی
      setStatus(AppStatus.LOADING_PLAN);
      const techResp = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
            { text: `به عنوان استادکار کابینت‌ساز، نقشه اجرایی و لیست برش قطعات را برای این آشپزخانه با سبک ${specs.style} ارائه بده. خروجی فقط JSON باشد.` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              technicalDescription: { type: Type.STRING },
              cutList: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    row: { type: Type.INTEGER },
                    partName: { type: Type.STRING },
                    length: { type: Type.NUMBER },
                    width: { type: Type.NUMBER },
                    count: { type: Type.INTEGER },
                    pvc: { type: Type.STRING }
                  },
                  required: ["row", "partName", "length", "width", "count", "pvc"]
                }
              }
            },
            required: ["technicalDescription", "cutList"]
          }
        }
      });

      const techData = JSON.parse(techResp.text || '{}');
      setResult({
        imageUrl: redesignedUrl,
        technicalDescription: techData.technicalDescription,
        cutList: techData.cutList
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err) {
      console.error(err);
      alert('خطا در پردازش. لطفاً API KEY را چک کنید.');
      setStatus(AppStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <nav className="bg-white border-b p-4 mb-8 print:hidden">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-700">طراح هوشمند کابینت</h1>
          <div className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold">SMART DESIGNER v2.5</div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* سایدبار تنظیمات */}
        <div className="lg:col-span-4 space-y-6 print:hidden">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">۱</span>
              تصویر آشپزخانه
            </h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 transition-colors overflow-hidden"
            >
              {image ? <img src={image} className="w-full h-full object-cover" /> : <span className="text-gray-400 text-sm">انتخاب فایل عکس</span>}
            </div>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-bold mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">۲</span>
              جزئیات طراحی
            </h2>
            <div>
              <label className="text-xs text-gray-400 block mb-1">سبک کابینت</label>
              <select className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none text-sm" value={specs.style} onChange={e => setSpecs({...specs, style: e.target.value})}>
                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">متریال</label>
              <select className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none text-sm" value={specs.material} onChange={e => setSpecs({...specs, material: e.target.value})}>
                {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <button 
              onClick={processDesign}
              disabled={status !== AppStatus.IDLE && status !== AppStatus.SUCCESS}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
            >
              {status === AppStatus.IDLE || status === AppStatus.SUCCESS ? 'شروع طراحی و آنالیز' : 'در حال پردازش...'}
            </button>
          </div>
        </div>

        {/* بخش نمایش نتایج */}
        <div className="lg:col-span-8 space-y-8">
          {result ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="bg-white rounded-[2rem] overflow-hidden shadow-xl border border-gray-100">
                <div className="p-4 bg-gray-900 text-white text-center text-sm font-bold">طرح پیشنهادی هوش مصنوعی</div>
                <img src={result.imageUrl} className="w-full" />
              </div>

              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-8">
                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">پلان فنی و توضیحات اجرایی</h3>
                  <div className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">{result.technicalDescription}</div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-800">لیست برش قطعات (Cut List)</h3>
                  <div className="overflow-x-auto border rounded-2xl">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-4">ردیف</th>
                          <th className="p-4">نام قطعه</th>
                          <th className="p-4">طول (cm)</th>
                          <th className="p-4">عرض (cm)</th>
                          <th className="p-4">تعداد</th>
                          <th className="p-4">PVC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {result.cutList.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="p-4 text-gray-400">{item.row}</td>
                            <td className="p-4 font-bold">{item.partName}</td>
                            <td className="p-4 text-indigo-600 font-bold">{item.length}</td>
                            <td className="p-4 text-indigo-600 font-bold">{item.width}</td>
                            <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded-md font-bold">{item.count}</span></td>
                            <td className="p-4 text-xs text-gray-400">{item.pvc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button onClick={() => window.print()} className="w-full bg-gray-800 text-white py-4 rounded-2xl font-bold print:hidden">چاپ نقشه برای نجار</button>
              </div>
            </div>
          ) : (
            <div className="h-[600px] bg-white border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-700">منتظر تصویر شما</h3>
              <p className="text-gray-400 max-w-xs mt-2 text-sm">لطفاً عکس آشپزخانه را از منوی سمت راست انتخاب کنید تا تحلیل هوشمند آغاز شود.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
