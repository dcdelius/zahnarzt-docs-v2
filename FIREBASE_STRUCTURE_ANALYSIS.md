# Firebase Structure Analysis & Data Flow

## Firebase Collections Structure

```
Praxen/
  └── 1/
      ├── Benutzer/          (Users)
      │   └── {userId}/
      │       ├── name: string
      │       ├── rolle: string
      │       └── avatarColor: string
      │
      ├── Vorlagen/           (Templates)
      │   └── {templateId}/
      │       ├── id: string
      │       ├── Kategorie: string
      │       ├── Prompt: string (or prompt)
      │       ├── Text: string (or text) ⚠️ CRITICAL FIELD
      │       ├── Material: string
      │       ├── systemInstructions: string
      │       ├── exampleOutput: string
      │       └── users: string[] (["all"] or specific user IDs)
      │
      ├── Bausteine/          (Building Blocks)
      │   └── {bausteinId}/
      │       ├── id: string
      │       ├── standardText: string
      │       ├── favorit: boolean
      │       └── vorlagen: string[] (template IDs)
      │
      └── Dokumentationen/    (Documentation History)
          └── {docId}/
              ├── behandlung: string (template ID)
              ├── transkript: string
              ├── dokumentation: string
              ├── timestamp: Timestamp
              └── user: string (user ID)
```

## Data Flow: Settings → Firebase → Dashboard → GPT

### 1. SAVING TEMPLATES (Settings.jsx → Firebase)

**Location:** `src/Settings.jsx:107-130`

```javascript
handleSaveVorlage() {
  const vorlageData = {
    id: vorlageId,
    Kategorie: editKategorie,
    Prompt: editPrompt,              // ✅ Saved
    Text: editText,                  // ✅ Saved (from TemplateBuilder)
    Material: editMaterial,
    systemInstructions: editSystemInstructions,  // ✅ Saved
    exampleOutput: editExampleOutput,            // ✅ Saved
    users: editVorlage?.users || ["all"]
  };
  
  await setDoc(doc(db, "Praxen", "1", "Vorlagen", vorlageId), vorlageData);
}
```

**Fields saved:**
- ✅ `Prompt` (capital P)
- ✅ `Text` (capital T) - **CRITICAL: Contains template structure with placeholders**
- ✅ `systemInstructions`
- ✅ `exampleOutput`
- ✅ `Kategorie`, `Material`, `users`

### 2. LOADING TEMPLATES (Firebase → Dashboard.jsx)

**Location:** `src/Dashboard.jsx:50-82`

```javascript
useEffect(() => {
  const templateSnap = await getDocs(collection(db, "Praxen", "1", "Vorlagen"));
  const templateList = templateSnap.docs.map((doc) => ({ 
    id: doc.id, 
    ...doc.data() 
  }));
  setTemplates(templateList);
}, []);
```

**Fields loaded:**
- ✅ All fields from Firebase are loaded via `...doc.data()`
- ✅ Includes: `id`, `Kategorie`, `Prompt`, `Text`, `systemInstructions`, `exampleOutput`, etc.

### 3. USING TEMPLATES IN GPT PROCESSING (Dashboard.jsx → GPT)

**Location:** `src/Dashboard.jsx:109-229` (handleTextSubmit) and `328-462` (handleRecordingToggle)

```javascript
const selectedTemplate = templates.find(t => t.id === selectedTreatment);

// Extract fields (with fallbacks for case sensitivity)
const templatePrompt = selectedTemplate.prompt || selectedTemplate.Prompt || "";
const templateText = selectedTemplate.Text || selectedTemplate.text || "";  // ✅ NOW USED
const systemInstructions = selectedTemplate.systemInstructions || "";
const exampleOutput = selectedTemplate.exampleOutput || "";

// Build GPT prompts
const systemPrompt = `...${templatePrompt}...${systemInstructions}...${exampleOutput}...`;

const userPrompt = `
  ${templateText ? `VORLAGEN-STRUKTUR: ${templateText}` : ''}
  ${bausteinTexte ? `BAUSTEINE: ${bausteinTexte}` : ''}
  Transkribierter Text: ${transcribedText}
`;
```

**Fields used:**
- ✅ `templatePrompt` → System prompt
- ✅ `templateText` → **NOW INCLUDED in user prompt** (FIXED)
- ✅ `systemInstructions` → System prompt
- ✅ `exampleOutput` → System prompt
- ✅ `bausteinTexte` → User prompt (from active building blocks)

## Potential Issues Found

### ✅ FIXED: Template Text Field Not Used
- **Problem:** `templateText` was extracted but not included in GPT prompts
- **Fix:** Added `templateText` to user prompt with instructions to use structure and fill placeholders
- **Status:** ✅ FIXED in latest changes

### ⚠️ POTENTIAL ISSUE: TemplateBuilder onChange Connection

**Location:** `src/Settings.jsx:427-431`

```javascript
<TemplateBuilder
  template={editVorlage}
  onChange={(updatedTemplate) => {
    setEditVorlage(prev => ({
      ...prev,
      Text: updatedTemplate.Text
    }));
    setEditText(updatedTemplate.Text || '');  // ✅ Updates editText
  }}
/>
```

**Status:** ✅ CORRECT - TemplateBuilder updates both `editVorlage.Text` and `editText`

### ⚠️ POTENTIAL ISSUE: Case Sensitivity

**Location:** Multiple places

- Settings saves: `Prompt` (capital P), `Text` (capital T)
- Dashboard checks: `prompt || Prompt`, `Text || text`
- **Status:** ✅ HANDLED - Fallbacks in place

### ⚠️ POTENTIAL ISSUE: TemplateBuilder Initialization

**Location:** `src/components/TemplateBuilder.jsx:32`

```javascript
const [content, setContent] = useState(template?.Text || '');
```

**Problem:** If `template` changes but `Text` doesn't update, content might be stale.

**Status:** ⚠️ NEEDS CHECK - Should use `useEffect` to sync when template changes

## Recommendations

1. ✅ **Template Text Field Integration** - FIXED
2. ⚠️ **TemplateBuilder Sync** - Add useEffect to sync content when template.Text changes
3. ✅ **Case Sensitivity** - Already handled with fallbacks
4. ✅ **Data Flow** - Complete: Settings → Firebase → Dashboard → GPT

## Testing Checklist

- [ ] Save template in Settings → Check Firebase console
- [ ] Load template in Dashboard → Verify all fields present
- [ ] Process text with template → Verify templateText in GPT prompt
- [ ] Check console logs for template data
- [ ] Verify placeholders are filled correctly

