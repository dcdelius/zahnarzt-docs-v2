export default function ContactSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-2xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-900">Kontakt aufnehmen</h2>
        <form className="bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-6">
          <input type="text" placeholder="Ihr Name" className="px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <input type="email" placeholder="Ihre E-Mail" className="px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <textarea placeholder="Ihre Nachricht" rows={4} className="px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition">Absenden</button>
        </form>
      </div>
    </section>
  );
} 