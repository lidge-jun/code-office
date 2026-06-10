import { loadDocxEditorProviderSources, withDerivedDocxSources } from './docxEditorProviderSources.mjs';
import { runDocxSaveAssertions } from './docxEditorProviderSaveAssertions.mjs';
import { runDocxStructureAssertions } from './docxEditorProviderStructureAssertions.mjs';
import { runDocxSurfaceAssertions } from './docxEditorProviderSurfaceAssertions.mjs';

const context = withDerivedDocxSources(await loadDocxEditorProviderSources());

runDocxStructureAssertions(context);
runDocxSaveAssertions(context);
runDocxSurfaceAssertions(context);

console.log('docx editor provider checks passed');
