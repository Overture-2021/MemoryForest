import { ArrowRight, Check, Heart, Search, Star } from 'lucide-react';
import '../../styles/handdrawn-mood-board.css';

const palette = [
  { name: 'Ink', value: '#1d1d1b' },
  { name: 'Graphite', value: '#6d6d66' },
  { name: 'Paper', value: '#fbfbf7' },
  { name: 'Memory green', value: '#7aa36f' },
  { name: 'Thread blue', value: '#5a8fb8' },
  { name: 'Signal rose', value: '#d6777d' },
];

const principles = [
  'Ruled-paper structure behind the whole app',
  'Uneven ink borders for panels, chips, inputs, and timeline lanes',
  'Tiny comic annotations for empty states, hints, and onboarding',
  'Doodle nodes and thread lines replacing polished graph chrome',
  'Sparse color used like marker highlights, not full fills',
];

const componentNotes = [
  'Primary actions feel like sketched labels taped to the page.',
  'Search, filters, and chips keep their shape, but lines wobble slightly.',
  'Event detail sheets can read like opened notebook margins.',
  'Status feedback uses stamps, circles, arrows, and underlines.',
];

export function HanddrawnMoodBoard() {
  return (
    <section className="mood-board" aria-labelledby="mood-board-title">
      <div className="mood-paper">
        <div className="mood-hero">
          <div className="mood-kicker">Memory Forest visual direction</div>
          <h2 id="mood-board-title">Handdrawn, notebook-first, a little comic.</h2>
          <p>
            A quiet journaling surface where shared memories feel mapped by hand: ruled pages,
            wobbly ink, soft marker color, and thread diagrams that look personal before they look
            technical.
          </p>
          <div className="mood-hero-actions" aria-label="Mood board tags">
            <span>Notebook UI</span>
            <span>Wireframe ink</span>
            <span>Memory map</span>
          </div>
        </div>

        <div className="mood-grid">
          <article className="mood-panel mood-panel-large">
            <div className="mood-panel-heading">
              <span>01</span>
              <h3>Reference Translation</h3>
            </div>
            <div className="reference-spread">
              <div className="journal-page" aria-label="Open journal sketch">
                <div className="journal-left" />
                <div className="journal-right">
                  <p className="journal-title">What do we keep?</p>
                  <p className="journal-line">A timeline should feel like something you could</p>
                  <p className="journal-line short">write in, circle, and hand to someone.</p>
                  <div className="comic-row">
                    <span className="stick-person" />
                    <span className="arrow-line" />
                    <span className="speech-bubble">HEY!</span>
                  </div>
                  <p className="journal-note">
                    Use small jokes and human annotations where the current UI feels too pristine.
                  </p>
                </div>
              </div>
              <div className="reference-caption">
                <strong>Keep:</strong> lined paper, handwritten hierarchy, comic-strip energy,
                empty space, monochrome confidence.
              </div>
            </div>
          </article>

          <article className="mood-panel">
            <div className="mood-panel-heading">
              <span>02</span>
              <h3>Palette</h3>
            </div>
            <div className="palette-strip">
              {palette.map((color) => (
                <div className="swatch" key={color.name}>
                  <span style={{ backgroundColor: color.value }} />
                  <small>{color.name}</small>
                  <code>{color.value}</code>
                </div>
              ))}
            </div>
          </article>

          <article className="mood-panel">
            <div className="mood-panel-heading">
              <span>03</span>
              <h3>UI Kit Feel</h3>
            </div>
            <div className="kit-sampler" aria-label="Handdrawn UI kit samples">
              <button type="button" className="sketch-button">
                Add memory
              </button>
              <button type="button" className="sketch-pill">
                shared thread
              </button>
              <label className="sketch-search">
                <Search aria-hidden="true" />
                <span>Search memories...</span>
              </label>
              <div className="sketch-controls">
                <span className="toggle on">ON</span>
                <span className="checkbox">
                  <Check aria-hidden="true" />
                </span>
                <span className="rating">
                  <Star aria-hidden="true" />
                  <Star aria-hidden="true" />
                  <Star aria-hidden="true" />
                </span>
              </div>
              <div className="pagination">
                <span>Prev</span>
                <span>1</span>
                <span>2</span>
                <span>Next</span>
              </div>
            </div>
          </article>

          <article className="mood-panel mood-panel-tall">
            <div className="mood-panel-heading">
              <span>04</span>
              <h3>Memory Forest Application</h3>
            </div>
            <div className="forest-sketch">
              <svg viewBox="0 0 520 360" role="img" aria-label="Handdrawn memory forest timeline">
                <path className="thread-line green" d="M88 315 C98 250 78 213 119 166 C158 121 132 76 167 38" />
                <path className="thread-line blue" d="M247 324 C226 260 263 232 241 174 C219 118 258 92 235 39" />
                <path className="thread-line rose" d="M410 320 C385 263 431 220 388 170 C349 126 394 83 360 42" />
                <path className="connector" d="M116 166 C174 142 207 152 241 174" />
                <path className="connector" d="M241 174 C295 187 335 191 388 170" />
                <path className="connector" d="M167 38 C214 75 274 75 360 42" />
                <circle className="node green" cx="119" cy="166" r="14" />
                <circle className="node blue" cx="241" cy="174" r="16" />
                <circle className="node rose" cx="388" cy="170" r="14" />
                <circle className="node green" cx="167" cy="38" r="11" />
                <circle className="node rose" cx="360" cy="42" r="12" />
                <text x="72" y="344">Alex</text>
                <text x="219" y="344">Mina</text>
                <text x="383" y="344">Jo</text>
                <text x="140" y="142">picnic</text>
                <text x="278" y="204">same day</text>
              </svg>
            </div>
            <p className="mood-note">
              The main canvas can become a notebook map: hand-drawn lanes, circled events, and
              lightly scribbled connectors. Zoom and focus controls should feel like paper tools,
              not analytics controls.
            </p>
          </article>

          <article className="mood-panel">
            <div className="mood-panel-heading">
              <span>05</span>
              <h3>Rules</h3>
            </div>
            <ul className="principle-list">
              {principles.map((principle) => (
                <li key={principle}>
                  <ArrowRight aria-hidden="true" />
                  <span>{principle}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="mood-panel">
            <div className="mood-panel-heading">
              <span>06</span>
              <h3>Component Notes</h3>
            </div>
            <div className="note-stack">
              {componentNotes.map((note, index) => (
                <p key={note} style={{ transform: `rotate(${index % 2 === 0 ? -1 : 1}deg)` }}>
                  {note}
                </p>
              ))}
            </div>
          </article>

          <article className="mood-panel mood-panel-wide">
            <div className="mood-panel-heading">
              <span>07</span>
              <h3>North Star</h3>
            </div>
            <div className="north-star">
              <Heart aria-hidden="true" />
              <p>
                Memory Forest should feel like opening a shared notebook and finding the timeline
                already alive with circles, arrows, marginalia, and the people who were there.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
