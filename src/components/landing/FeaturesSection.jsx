const features = [
  {
    title: 'KI-gestützte Dokumentation',
    description: 'Automatisierte, intelligente Erfassung und Strukturierung medizinischer Behandlungsdaten – schnell, sicher und DSGVO-konform.',
    icon: '🤖',
  },
  {
    title: 'Team-Kollaboration',
    description: 'Nahtlose Zusammenarbeit im Praxisteam mit Rollen, Vorlagen und Verlauf. Jederzeit nachvollziehbar.',
    icon: '👥',
  },
  {
    title: 'Sichere Cloud',
    description: 'Alle Daten werden verschlüsselt in der Cloud gespeichert und sind jederzeit verfügbar – auch mobil.',
    icon: '☁️',
  },
  {
    title: 'Einfache Integration',
    description: 'Schnittstellen zu Praxissoftware und einfache Bedienung – keine IT-Kenntnisse nötig.',
    icon: '🔌',
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">Unsere Stärken</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-blue-50 rounded-3xl shadow-lg p-8 flex flex-col items-center text-center hover:scale-105 transition-transform">
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2 text-blue-800">{feature.title}</h3>
              <p className="text-gray-600 text-base">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 