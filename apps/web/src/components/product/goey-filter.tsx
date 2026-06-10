const GooeyFilter = () => {
  return (
    <svg
      className="absolute pointer-events-none"
      style={{ width: 0, height: 0 }}
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <filter id="gooey" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>

        <filter id="gooey-subtle" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 15 -6"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
    </svg>
  );
};

export default GooeyFilter;
