import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(relPath: string): string {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('gate-v10-only-app-surface', () => {
    it('App runtime exposes V10 routes and redirects legacy surfaces', () => {
        const app = read('src/App.jsx');

        expect(app).toContain("const V10Router = lazy(() => import('./docudent/v10/app/V10Router')");
        expect(app).not.toContain("import('./docudent/v7/app/V7Router')");
        expect(app).not.toContain("import('./docudent/v8/app/V8Router')");
        expect(app).not.toContain("import('./docudent/v5/pages/DocudentV5Page')");
        expect(app).not.toContain("import('./pages/HomePage')");
        expect(app).not.toContain("import('./docudent/v7/pages/LandingPage')");

        expect(app).toContain('<Route path="/docudent/v10/*" element={<V10Router />} />');
        expect(app).toContain('<Route path="/docudent/v7/*" element={<Navigate to="/docudent/v10" replace />} />');
        expect(app).toContain('<Route path="/docudent/v8/*" element={<Navigate to="/docudent/v10" replace />} />');
        expect(app).toContain('<Route path="/docudent/v5" element={<Navigate to="/docudent/v10" replace />} />');
        expect(app).toContain('<Route path="/docudent/v6" element={<Navigate to="/docudent/v10" replace />} />');
        expect(app).toContain('<Route path="/docudent" element={<Navigate to="/docudent/v10" replace />} />');
    });

    it('V10 router only serves doc flow + settings', () => {
        const router = read('src/docudent/v10/app/V10Router.tsx');

        expect(router).toContain('<Route index element={<DocudentV10Page />} />');
        expect(router).toContain('<Route path="settings" element={<SettingsPageV10 />} />');
        expect(router).not.toContain('CasesPageV7');
        expect(router).not.toContain('TeamPage');
        expect(router).not.toContain('path="cases"');
        expect(router).not.toContain('path="team"');
    });

    it('V10 page does not expose dead links to disabled routes', () => {
        const page = read('src/docudent/v10/pages/DocudentV10Page.tsx');

        expect(page).toContain('<Link to="/docudent/v10/settings"');
        expect(page).not.toContain('/docudent/v10/cases');
    });

    it('Top navigation does not expose legacy destinations', () => {
        const topNav = read('src/components/TopNavigation.jsx');

        expect(topNav).toContain('{ to: "/docudent/v10", label: "V10" }');
        expect(topNav).toContain('{ to: "/docudent/v10/settings", label: "Settings" }');
        expect(topNav).not.toContain('/dashboard');
        expect(topNav).not.toContain('/sonia-v3/settings');
        expect(topNav).not.toContain('/lab/sonia');
        expect(topNav).not.toContain('{ to: "/settings",');
    });
});
