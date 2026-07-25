import mermaid from 'mermaid/dist/mermaid.core.mjs';
import elkLayouts from '@mermaid-js/layout-elk';

// Register the ELK layout loaders to Mermaid
mermaid.registerLayoutLoaders(elkLayouts);

// We can't easily import the diagram renderers directly as they are in hashed chunks
// However, Mermaid core by default does NOT register any diagrams if you import it this way.
// BUT, in the mermaid.core.mjs from the package, it actually DOES include all detectors 
// and they use dynamic imports for the loaders.

export default mermaid;