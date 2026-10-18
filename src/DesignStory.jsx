import { useEffect, useRef, useState } from 'react';
import { ColorExample, DensityExample, MotionExample } from './StoryExamples.jsx';
import { LoadingExample, DesktopLampExample } from './StoryStateExamples.jsx';

const CHAPTERS = [
  ['story-abstract', 'Abstract'],
  ['story-introduction', 'Introduction'], ['story-density', 'Density'],
  ['story-continuity', 'Continuity'], ['story-feedback', 'States in motion'], ['story-color', 'Color'],
  ['story-light', 'Light'], ['story-interaction', 'Interaction'],
  ['story-study', 'One system'],
];

export function DesignStory({ motionEnabled = true }) {
  const articleRef = useRef(null);
  const indexRef = useRef(null);
  const [activeChapter, setActiveChapter] = useState(null);
  useEffect(() => {
    const article = articleRef.current;
    const sections = CHAPTERS.map(([id]) => article.querySelector(`#${id}`));
    let frame = null;
    const update = () => {
      frame = null;
      const readingLine = Math.min(innerHeight * .25, innerWidth <= 700 ? 120 : 160);
      const bounds = article.getBoundingClientRect();
      let current = null;
      if (bounds.top <= readingLine && bounds.bottom > readingLine) {
        for (const section of sections) {
          if (section.getBoundingClientRect().top > readingLine) break;
          current = section.id;
        }
        if (scrollY + innerHeight >= document.documentElement.scrollHeight - 8) current = sections.at(-1).id;
      }
      setActiveChapter(previous => previous === current ? previous : current);
      // Recheck the strip on resize/font layout even if the chapter is unchanged.
      if (current && innerWidth <= 700) {
        const index = indexRef.current;
        const link = index.querySelector(`[href="#${current}"]`);
        const left = link.offsetLeft, right = left + link.offsetWidth;
        if (left < index.scrollLeft) index.scrollLeft = left;
        else if (right > index.scrollLeft + index.clientWidth) index.scrollLeft = right - index.clientWidth;
      }
    };
    const schedule = () => { if (frame === null) frame = requestAnimationFrame(update); };
    const resize = new ResizeObserver(schedule);
    resize.observe(article);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Native fragments also work when React mounts after the initial URL load.
    const target = sections.find(section => `#${section.id}` === location.hash);
    target?.scrollIntoView();
    update();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      resize.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return <article ref={articleRef} className="design-story" aria-labelledby="design-story-title">
    <div className="story-authorship" aria-label="Project credits">
      <p className="story-credit">component experiment by</p>
      <div className="story-credit-main">
        <div className="story-credit-meta"><span>figma, codex</span><span>oct 2026</span></div>
        <p className="story-author">christopher robin fiore</p>
      </div>
    </div>
    <header className="story-header">
      <h2 id="design-story-title">Why my mind went to jelly</h2>
    </header>

    <div className="story-layout">
      <nav ref={indexRef} className="story-index" aria-label="Design story chapters">
        {CHAPTERS.map(([id, label], index) => <a key={id} href={`#${id}`} aria-current={activeChapter === id ? 'location' : undefined}>
          <span className="story-chapter-number" aria-hidden="true">{String(index).padStart(2, '0')}</span><span>{label}</span>
        </a>)}
      </nav>
      <div className="story-chapters">
        <section id="story-abstract" className="story-section story-abstract" tabIndex={-1} aria-labelledby="story-abstract-title">
          <h3 id="story-abstract-title">00 Abstract</h3>
          <div className="story-copy">
            <p>JellyBox is a React-based design system study built around one shared material. It keeps the fluidity, translucency and light reactivity of the glass metaphor, then uses changing density to give that surface structure. Color, light and motion work together to communicate hierarchy, state and ownership. Spectral.js supplies a shared, pigment-inspired path between colors.</p>
            <p>I’m exploring whether this can make interfaces more intuitive: fluid spaces that gather, divide and reshape while labels and controls remain stable. The interactions work here; the UX hypothesis still needs testing.</p>
          </div>
        </section>
        <section id="story-introduction" className="story-section" tabIndex={-1} aria-labelledby="story-introduction-title">
          <h3 id="story-introduction-title">Introduction</h3>
          <div className="story-copy">
            <p>JellyBox is a design system study inspired by the color and translucency of old Macintosh interfaces and the early 2000s Frutiger Aero design language. What I love about that world is how fun, vibrant and alive it feels. Light passes through the color, reflections shift across the surface, and the interface has a little energy of its own. Seeing those qualities return through <a href="https://developer.apple.com/documentation/technologyoverviews/liquid-glass" target="_blank" rel="noreferrer">Apple’s Liquid Glass</a> made me want to take the idea further.</p>
            <p>I wanted to develop a full system for how an interface looks, moves and behaves. JellyBox uses the material to explain hierarchy, selection, grouping and change. These three buttons are the current proving ground for that larger idea: one shared language, expressed through working interactions.</p>
          </div>
        </section>

        <section id="story-density" className="story-section" tabIndex={-1} aria-labelledby="story-density-title">
          <h3 id="story-density-title">Density</h3>
          <div className="story-copy">
            <p>What jelly adds to the glass metaphor is a density that can change and become structure. A glass-style interface usually reads as separate panes. Jelly can remain one connected mass while gathering into a firmer edge, thinning into a reading area or separating into smaller working groups.</p>
            <p>For me, that makes jelly a stronger foundation for paying homage to the colorful Macintosh and Frutiger Aero interfaces I love. It keeps the translucency and light reactivity, while giving the interface another way to organize itself. The density becomes part of how you understand the space.</p>
            <p>More concentrated areas carry thickness, color and a defined edge. Thinner areas keep the content open and readable. A border is a denser part of the same material. An inner group can gather out of its parent window, with a clear boundary that still belongs to the whole. Structure can become firmer where a task needs precision and looser where it helps you move between things.</p>
            <p>Shape &amp; optics is a small example: the compact pill stretches into an inner folder, holds the extra controls, then gathers back. Its edge, depth and lighting change together. The text stays steady.</p>
          </div>
          <DensityExample motionEnabled={motionEnabled} />
        </section>

        <section id="story-continuity" className="story-section" tabIndex={-1} aria-labelledby="story-continuity-title">
          <h3 id="story-continuity-title">Continuity</h3>
          <div className="story-copy">
            <p>I began by building separate components, then narrowed the prototype back to three buttons so I could work on the relationships between them. The design system is the larger goal; this smaller experiment lets me develop its behavior in detail.</p>
            <p>A button expands into a pill, then joins the top-left edge of its window as a tab. Closing gathers it back into a button. Switching tools lets the old tab withdraw while the next one takes its place. The stretch, pinch and small settling wobble are there to explain where the space came from and who owns it now.</p>
            <p>The jelly moves around the interface’s structure: labels, values and click targets stay anchored. Custom Bézier curves and damped settling shape the motion, and an interrupted transition continues from its current state.</p>
            <p>A larger space gets time to gather. A slider responds sooner. The little overshoot is reserved for the material; it never carries a value past its limit. These are authored interface responses, rather than measurements of physical jelly.</p>
          </div>
          <MotionExample motionEnabled={motionEnabled} />
        </section>

        <section id="story-feedback" className="story-section" tabIndex={-1} aria-labelledby="story-feedback-title">
          <h3 id="story-feedback-title">States in motion</h3>
          <div className="story-copy">
            <p>Waiting is another place where the jelly can explain what’s happening. While a task is running, dense blue jelly moves through the whole button and breathes gently. Its shape, highlights and refraction follow the same current. A percentage and progress rail show how far along the task is when that information is available. Without it, the circulation communicates that work is continuing without inventing a completion value.</p>
            <p>When work finishes, that moving mass gathers into the result: green for completion, amber when something needs review, red when the task fails. Color, density and motion share that transition, while the label and icon make the state explicit. Reduced motion keeps the words, progress and outcome. I’m exploring whether keeping those changes in one continuous material makes a task easier to follow.</p>
          </div>
          <LoadingExample />
        </section>

        <section id="story-color" className="story-section" tabIndex={-1} aria-labelledby="story-color-title">
          <h3 id="story-color-title">Color</h3>
          <div className="story-copy">
            <p>I use <a href="https://github.com/rvanwijnen/spectral.js/" target="_blank" rel="noreferrer">Spectral.js</a> for pigment-inspired color mixing. Its Kubelka–Munk model gives me a shared mixing path for the material’s colors. Precomputed samples let the controls and window follow that path smoothly, including when a color changes halfway through a transition.</p>
            <p>Color also has a job. Clear blue is the resting material; a highlight invites interaction; a denser selection marks the committed choice. Save uses green and Delete uses red. Labels, checks and focus indicators carry those meanings too. Trying a palette shows a preview before applying it, so exploring a color doesn’t silently change the current choice.</p>
            <p>Color can also carry a relationship. When two items join a working group, their pigments can mix into a shared identity, with a denser connection marking that they belong together. Separating them returns their individual colors. A pending edit can flow through that connection as a preview while the accepted grouping stays intact. This gives the jelly another job: showing what belongs together, what is changing, and what you’ve committed.</p>
            <p>Legibility has to travel with the color. A shared reading rule keeps the lettering steady while the jelly becomes thinner and quieter beneath it, with denser color at its shoulders. Rendered samples check the contrast rather than making the letters switch whenever a highlight passes. The color belongs to the letters themselves, without an outline or a backing over the material.</p>
          </div>
          <ColorExample motionEnabled={motionEnabled} />
        </section>

        <section id="story-light" className="story-section" tabIndex={-1} aria-labelledby="story-light-title">
          <h3 id="story-light-title">Light</h3>
          <div className="story-copy">
            <p>The little bulb is a movable light in the rendered scene. Dragging it changes the direction of highlights, colored casts and transmitted light on the textured surface. Its brightness, height, softness and warmth can be adjusted together.</p>
            <p>I wanted light reactivity to belong to the material itself. It could help reveal depth and grouping, or give someone another way to tune the feel of a workspace. Reading areas keep the effects quieter so a shadow can’t pretend to be a control. Text and selected states still need to make sense with the light off.</p>
            <p>I’m thinking of this as a lamp on a real desk. You place it where you want it and adjust it while you work. A light-reactive interface could offer that same ambient experience on a digital desktop: a pool of light across the workspace, with the jelly responding naturally around it. It stays where you put it instead of following every hover or telling you what to do next. Here you can move that light between three positions and change its height and brightness. The controls keep their meaning with the lamp off.</p>
          </div>
          <DesktopLampExample motionEnabled={motionEnabled} />
        </section>

        <section id="story-interaction" className="story-section" tabIndex={-1} aria-labelledby="story-interaction-title">
          <h3 id="story-interaction-title">Interaction</h3>
          <div className="story-copy">
            <p>Density also gives me a way to work with space. Sliders keep a short rail, label and value visible at rest, then their material gathers on approach or focus. The value bubbles can be dragged for quick adjustment, with Shift for finer control and Escape to cancel. A little magnetic movement draws the jelly toward the cursor while the actual target stays put. The material acknowledges where you’re going without making you chase the control.</p>
            <p>These details share the same rule: the material can be expressive, but the controls have to remain predictable. Keyboard input, visible focus, readable values and reduced-motion support stay part of the system. A small jiggle shouldn’t make someone wait to act.</p>
          </div>
        </section>

        <section id="story-study" className="story-section" tabIndex={-1} aria-labelledby="story-study-title">
          <h3 id="story-study-title">One system</h3>
          <div className="story-copy">
            <p>JellyBox brings appearance and interaction into one system. Density establishes hierarchy and boundaries. Motion explains ownership and change. Color communicates role, preview and commitment. Light describes the shared material. The same rules follow a space as it combines, separates, shrinks or expands, so each interaction can reinforce what the interface is doing.</p>
            <p>I want to carry that thinking into larger workspaces: groups that gather or divide as a task changes, compact controls that reveal more when needed, and previews that let you explore media or color before committing. Those are directions for the system to grow. The three-button prototype is where I’m working out the underlying rules.</p>
            <p>This is still a working experiment. The geometry, lighting and settling are authored real-time approximations, and Spectral.js describes pigment mixing rather than the transmission of real jelly. The interactions are implemented here; whether they help people navigate and understand an interface needs testing. That’s the next question I want the study to answer.</p>
          </div>
        </section>
      </div>
    </div>
  </article>;
}
