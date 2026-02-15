// Script to update all template prompts in Firebase
// Run this in the browser console while on any page of the app

import { db } from './src/firebase.js';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

const NEW_PROMPT = `Halte dich strikt an die Vorlagen-Struktur und die System-Anweisungen. 
Wenn im Diktat zusätzliche Behandlungen oder Informationen erwähnt werden, die nicht in der Vorlage stehen, füge diese trotzdem hinzu. 
Verwende die Materialien aus der Vorlage, es sei denn, im Diktat werden andere Materialien genannt.`;

async function updateAllPrompts() {
  try {
    console.log('🔄 Starte Update aller Vorlagen-Prompts...');
    
    // Lade alle Vorlagen
    const templateSnap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
    const templates = templateSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    
    console.log(`📋 Gefunden: ${templates.length} Vorlagen`);
    
    let updated = 0;
    let skipped = 0;
    
    // Update jede Vorlage
    for (const template of templates) {
      const templateId = template.id;
      const currentPrompt = template.Prompt || template.prompt || "";
      
      // Prüfe ob bereits der neue Prompt vorhanden ist
      if (currentPrompt.includes("Halte dich strikt an die Vorlagen-Struktur") && 
          currentPrompt.includes("Wenn im Diktat zusätzliche Behandlungen")) {
        console.log(`⏭️  Übersprungen: ${templateId} (hat bereits neuen Prompt)`);
        skipped++;
        continue;
      }
      
      // Update mit neuem Prompt
      const updatedData = {
        ...template,
        Prompt: NEW_PROMPT,
        prompt: NEW_PROMPT // Auch lowercase-Version für Kompatibilität
      };
      
      await setDoc(doc(db, "Praxen", "1", "Vorlagen", templateId), updatedData);
      console.log(`✅ Aktualisiert: ${templateId}`);
      updated++;
    }
    
    console.log(`\n✅ Fertig!`);
    console.log(`   - Aktualisiert: ${updated} Vorlagen`);
    console.log(`   - Übersprungen: ${skipped} Vorlagen`);
    console.log(`   - Gesamt: ${templates.length} Vorlagen`);
    
    return { updated, skipped, total: templates.length };
  } catch (error) {
    console.error('❌ Fehler beim Update:', error);
    throw error;
  }
}

// Export für Verwendung
if (typeof window !== 'undefined') {
  window.updateAllPrompts = updateAllPrompts;
}

export { updateAllPrompts };

