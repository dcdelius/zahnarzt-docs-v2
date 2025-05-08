export default function Footer() {
  return (
    <footer className="bg-blue-900 text-white py-8 mt-12">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="font-bold text-lg tracking-wide">EVIDENT A.I.</div>
        <div className="flex gap-6 text-sm">
          <a href="#" className="hover:underline">Impressum</a>
          <a href="#" className="hover:underline">Datenschutz</a>
          <a href="#" className="hover:underline">Kontakt</a>
        </div>
        <div className="text-xs text-blue-200">© {new Date().getFullYear()} Evidentia. Alle Rechte vorbehalten.</div>
      </div>
    </footer>
  );
} 