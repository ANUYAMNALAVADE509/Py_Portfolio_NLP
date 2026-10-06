import { useState } from "react";

import "./Walkthrough.css";

const slides = [
  {
    number: "01",
    title: "Understand your portfolio",
    text:
      "See your financial information in one structured workspace."
  },
  {
    number: "02",
    title: "Follow relevant market news",
    text:
      "Monitor news connected to companies and assets that matter to your portfolio."
  },
  {
    number: "03",
    title: "Understand financial language",
    text:
      "Our NLP layer identifies sentiment, entities, risk signals and relevant events."
  },
  {
    number: "04",
    title: "Ask the AI Assistant",
    text:
      "Ask questions about current financial information and receive evidence-backed responses."
  }
];

export default function Walkthrough() {
  const [active, setActive] = useState(0);

  const next = () => {
    setActive((active + 1) % slides.length);
  };

  const previous = () => {
    setActive(
      (active - 1 + slides.length) % slides.length
    );
  };

  const slide = slides[active];

  return (
    <section className="walkthrough">
      <div className="walkthrough-content">

        <span className="eyebrow">
          HOW QUANTRISK AI WORKS
        </span>

        <span className="slide-number">
          {slide.number}
        </span>

        <h2>{slide.title}</h2>

        <p>{slide.text}</p>

        <div className="carousel-controls">

          <button
            type="button"
            onClick={previous}
            aria-label="Previous walkthrough slide"
          >
            ←
          </button>

          <div className="carousel-dots">
            {slides.map((_, index) => (
              <button
                type="button"
                key={index}
                className={
                  index === active
                    ? "dot active"
                    : "dot"
                }
                onClick={() => setActive(index)}
                aria-label={`Go to walkthrough slide ${index + 1}`}
                aria-current={
                  index === active ? "true" : undefined
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="Next walkthrough slide"
          >
            →
          </button>

        </div>

      </div>
    </section>
  );
}