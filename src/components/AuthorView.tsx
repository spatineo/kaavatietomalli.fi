import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Linkedin, Twitter, Globe, Mail } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AuthorData } from '../lib/blog';

interface AuthorViewProps {
  author: AuthorData;
  onBack: () => void;
}

export function AuthorView({ author, onBack }: AuthorViewProps) {
  useEffect(() => {
    // Add discovery link for LLMs
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.type = 'text/markdown';
    link.title = 'Raw Markdown';
    link.href = `https://raw.githubusercontent.com/spatineo/kaavatietomalli.fi/refs/heads/main/src/content/authors/${author.slug}.md`;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [author.slug]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto py-24 px-6 md:px-10"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-4 text-slate-400 hover:text-brand-accent transition-colors group px-4 py-2 rounded-lg hover:bg-white/5 uppercase font-bold tracking-[0.2em] text-[10px] mb-20"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Palaa alkuun
      </button>

      <div className="grid md:grid-cols-[1fr_2fr] gap-16 md:gap-24">
        <aside className="flex flex-col gap-10">
          <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
            <img 
              src={author.image} 
              alt={author.name} 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-3">Yhteystiedot</h3>
              <div className="flex gap-3">
                <a href="#" className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-brand-accent/20 transition-all border border-white/5">
                  <Linkedin size={18} />
                </a>
                <a href="#" className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-brand-accent/20 transition-all border border-white/5">
                  <Twitter size={18} />
                </a>
                <a href="#" className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-brand-accent/20 transition-all border border-white/5">
                  <Globe size={18} />
                </a>
                <a href="#" className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-brand-accent/20 transition-all border border-white/5">
                  <Mail size={18} />
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-3">Erikoisalat</h3>
              <div className="flex flex-wrap gap-2">
                {['Tietomallit', 'Kaavoitus', 'Yhteentoimivuus', 'Digitalisaatio'].map(skill => (
                  <span key={skill} className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section>
          <header className="mb-16">
            <h1 className="text-6xl md:text-8xl font-black text-white leading-none tracking-tighter mb-6">
              {author.name}
            </h1>
            <p className="text-2xl text-brand-accent font-bold leading-tight">
              {author.title}
            </p>
            {author.company &&
             <p className="text-2xl text-brand-accent font-bold leading-tight">
              {author.company}
            </p>
            }
          </header>

          <div className="markdown-body">
            <ReactMarkdown>{author.content}</ReactMarkdown>
          </div>
          {author.company == 'Spatineo Oy' &&
          <div className="mt-20 p-10 rounded-3xl bg-white/5 border border-white/10">
            <h4 className="text-lg font-bold text-white mb-4">Haluatko keskustella yhteistyöstä?</h4>
            <p className="text-slate-400 mb-8">
              Ilkka ja Spatineon asiantuntijat auttavat organisaatiotanne hyödyntämään rakennetun ympäristön tietoa tehokkaammin.
            </p>
            <button className="bg-brand-accent text-brand-primary px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-opacity">
              Ota yhteyttä
            </button>
          </div>
          }
        </section>
      </div>

      <footer className="mt-40 pt-20 border-t border-white/10 text-center">
        <h3 className="text-3xl font-extrabold mb-4 text-white">Kaavatietomalli.fi</h3>
        <p className="text-slate-400 mb-12">Digitalisoidun rakennetun ympäristön tietopalvelu.</p>
        <button
          onClick={onBack}
          className="bg-black text-white border border-white/10 px-10 py-4 rounded-xl transition-all duration-300 hover:bg-brand-bg hover:border-brand-accent hover:text-brand-accent shadow-xl shadow-black/20 uppercase font-bold tracking-widest text-[10px]"
        >
          Takaisin etusivulle
        </button>
      </footer>
    </motion.article>
  );
}
