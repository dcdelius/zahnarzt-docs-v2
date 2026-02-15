const steps = [
  {
    title: '1. Anmeldung',
    description: 'Registrieren Sie Ihre Praxis und laden Sie Ihr Team ein – in wenigen Minuten startklar.',
  },
  {
    title: '2. Dokumentieren',
    description: 'Behandlungen per Sprache oder Text erfassen. KI strukturiert und speichert alles automatisch.',
  },
  {
    title: '3. Auswerten & Exportieren',
    description: 'Alle Dokumentationen durchsuchen, exportieren oder direkt weiterverarbeiten.',
  },
];

export default function StepsSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">So einfach geht's</h2>
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
          {steps.map((step, idx) => (
            <div key={idx} className="flex-1 bg-white rounded-2xl shadow-md p-8 text-center border-t-4 border-blue-400">
              <div className="text-4xl font-bold text-blue-600 mb-4">{step.title}</div>
              <p className="text-gray-700 text-base">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 