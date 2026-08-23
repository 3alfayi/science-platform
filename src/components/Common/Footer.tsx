import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 py-6 mt-auto border-t border-slate-800">
      <div className="container mx-auto px-4 text-center space-y-2">
        <p className="font-bold text-lg text-white">
          أنشطة وواجبات مادة العلوم لعام 1448 هـ
        </p>
        <div className="flex justify-center items-center gap-6 text-sm text-slate-400 pt-2 border-t border-slate-800/60 max-w-md mx-auto">
          <span>إشراف المعلم: <strong className="text-emerald-400">عبدالعزيز آل فايع</strong></span>
          <span>•</span>
          <span>مدير المدرسة: <strong className="text-emerald-400">محمد الشهري</strong></span>
        </div>
      </div>
    </footer>
  );
};