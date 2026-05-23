import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Linkedin, Twitter, Github, Globe, Mail } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AuthorData } from '../lib/blog';
import { resolveImageUrl } from '../lib/utils';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { getTracker } from '../services/analytics';
import { ContentFooter } from './ContentFooter';

interface AuthorViewProps {
  author: AuthorData;
  onBack: () => void;
}

function ObfuscatedEmailIcon({ email }: { email: string }) {
  const t = getTranslations(CONFIG.language as Language);
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const decodedEmail = email.replace(' [at] ', '@').replace(' [dot] ', '.');
    window.location.href = `mailto:${decodedEmail}`;
  };

  return (
    <a 
      href="#" 
      onClick={handleClick}
      className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-brand-accent/20 transition-all border border-white/5"
      title={t.author.sendEmail}
    >
      <Mail size={18} />
    </a>
  );
}

export function AuthorView({ author, onBack }: AuthorViewProps) {
  const t = getTranslations(CONFIG.language as Language);
  useEffect(() => {
    getTracker().trackAuthorView(author.slug, author.name);
    getTracker().trackPageView(`${CONFIG.basePath}?author=${author.slug}`, author.name);

    // Add discovery link for LLMs
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.type = 'text/markdown';
    link.title = 'Raw Markdown';
    link.href = `https://raw.githubusercontent.com/${CONFIG.repoOwner}/${CONFIG.repoName}/refs/heads/main/src/content/authors/${author.slug}.md`;
    document.head.appendChild(link);

    return () => {
      if (link.parentNode === document.head) {
        document.head.removeChild(link);
      }
    };
  }, [author.slug]);

  const hasSocial = author.social && Object.values(author.social).some(val => !!val);

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
        {t.common.backToHome}
      </button>

      <div className="grid md:grid-cols-[1fr_2fr] gap-16 md:gap-24">
        <aside className="flex flex-col gap-10">
          <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
            <img 
              src={resolveImageUrl(author.image)} 
              alt={author.name} 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-6">
            {hasSocial && (
              <div>
                <h3 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-3">{t.author.contactInfo}</h3>
                <div className="flex gap-3">
                  {author.social?.linkedin && (
                    <a 
                      href={author.social.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-brand-accent/20 transition-all border border-white/5"
                    >
                      <Linkedin size={18} />
                    </a>
                  )}
                  {author.social?.twitter && (
                    <a 
                      href={author.social.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-brand-accent/20 transition-all border border-white/5"
                    >
                      <Twitter size={18} />
                    </a>
                  )}
                  {author.social?.github && (
                    <a 
                      href={author.social.github} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-brand-accent/20 transition-all border border-white/5"
                    >
                      <Github size={18} />
                    </a>
                  )}
                  {author.social?.website && (
                    <a 
                      href={author.social.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-brand-accent/20 transition-all border border-white/5"
                    >
                      <Globe size={18} />
                    </a>
                  )}
                  {author.social?.email && <ObfuscatedEmailIcon email={author.social.email} />}
                </div>
              </div>
            )}

            {author.skills && author.skills.length > 0 && (
              <div>
                <h3 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-3">{t.author.specialties}</h3>
                <div className="flex flex-wrap gap-2">
                  {author.skills.map(skill => (
                    <span key={skill} className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
            <ReactMarkdown urlTransform={(url) => resolveImageUrl(url)}>{author.content}</ReactMarkdown>
          </div>
          {"Spatineo Oy" == author.company && (
          <div className="mt-20 p-10 rounded-3xl bg-white/5 border border-white/10">
            <h4 className="text-lg font-bold text-white mb-4">{t.author.cooperationTitle}</h4>
            <p className="text-slate-400 mb-8">
              {t.author.cooperationText}
            </p>
            <button 
              onClick={() => getTracker().trackCTA(t.author.contactUs, undefined, `author:${author.slug}`)}
              className="bg-brand-accent text-brand-primary px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-opacity"
            >
              {t.author.contactUs}
            </button>
          </div>
          )}
        </section>
      </div>

      <ContentFooter onBack={onBack} className="mt-40" />
    </motion.article>
  );
}
