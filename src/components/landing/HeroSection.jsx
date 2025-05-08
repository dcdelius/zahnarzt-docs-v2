export default function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[70vh] text-center px-4 py-24 bg-gradient-to-br from-blue-100 to-blue-300">
      <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 drop-shadow-lg">EVIDENT A.I.</h1>
      <p className="text-lg md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto">Die moderne KI-gestützte Dokumentationslösung für medizinische Praxen und Teams. Schnell. Sicher. Effizient.</p>
      <a href="/dashboard" className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition">Jetzt starten</a>
      <div className="absolute inset-0 pointer-events-none select-none">
        <svg className="absolute bottom-0 left-0 w-full h-32" viewBox="0 0 1440 320"><path fill="#fff" fillOpacity="1" d="M0,224L48,197.3C96,171,192,117,288,117.3C384,117,480,171,576,197.3C672,224,768,224,864,197.3C960,171,1056,117,1152,117.3C1248,117,1344,171,1392,197.3L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>
      </div>
    </section>
  );
} 