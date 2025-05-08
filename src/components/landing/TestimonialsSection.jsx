const testimonials = [
  {
    name: 'Dr. Anna Müller',
    role: 'Zahnärztin, Berlin',
    text: 'EVIDENT A.I. hat unsere Dokumentation revolutioniert. Die KI spart uns täglich viel Zeit und die Bedienung ist kinderleicht!',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    name: 'Dr. Max Schmidt',
    role: 'Kieferorthopäde, München',
    text: 'Endlich eine Lösung, die wirklich für Praxen gemacht ist. Mein Team ist begeistert von der Zusammenarbeit!',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">Das sagen unsere Nutzer</h2>
        <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch">
          {testimonials.map((t, idx) => (
            <div key={idx} className="flex-1 bg-blue-50 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
              <img src={t.avatar} alt={t.name} className="w-20 h-20 rounded-full mb-4 border-4 border-blue-200 object-cover" />
              <p className="text-gray-700 text-lg mb-4">“{t.text}”</p>
              <div className="font-semibold text-blue-800">{t.name}</div>
              <div className="text-sm text-gray-500">{t.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 