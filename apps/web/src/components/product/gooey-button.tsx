import { ArrowRight } from "@carbon/icons-react";
import Link from "next/link";

export const ButtonGooey = ({ text, href }: { text: string; href: string }) => {
  return (
    <>
      <div className="wrapper">
        <Link href={href} className="button">
          {text}
          <div className="bubble">
            <ArrowRight className="h-8 w-8" />
          </div>
        </Link>
      </div>

      <svg
        className="absolute hidden"
        width="0"
        height="0"
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        aria-hidden="true"
        role="presentation"
      >
        <defs>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>

      <style jsx>{`
        .wrapper {
          filter: url("#gooey");
          height: 100%;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .button {
          background: #000;
          color: #eee;
          display: inline-flex;
          font-weight: 500;
          padding: 0 16px 0 16px;
          border-radius: 8px;
          font-size: 1rem;
          line-height: 1rem;
          height: 48px;
          align-items: center;
        }

        .bubble {
          color: #fff;
          z-index: -10;
          display: flex;
          background: #000;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          position: absolute;
          content: "";
          border-radius: 8px;
          transition: transform 0.8s;
          transition-timing-function: bezier(0.2, 0.8, 0.2, 1.2);
          transform: translateX(80%) translateY(0%);
        }

        .button:hover .bubble {
          transform: translateX(210%) translateY(0%);
        }
      `}</style>
    </>
  );
};
