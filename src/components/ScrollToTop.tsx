"use client";

import { useEffect, useState } from "react";

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Every time the window is scrolled, call the toggleVisibility function
    window.addEventListener("scroll", toggleVisibility);

    // When the component unmounts, remove the event listener, prevents memory leaks
    // The "cleanup" function (the return inside useEffect) runs when the component unmounts.
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []); // Only run once

  // Function to scroll to the top of the page
  // window.scrollTo is a built-in browser command (not specific to React)
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      // ${}: Anything inside these brackets is treated as code.
      className={`back-to-top ${isVisible ? "visible" : ""}`}
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      <span className="back-to-top__icon">↑</span>
    </button>
  );
};

export default ScrollToTop;
