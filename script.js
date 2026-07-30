const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#site-nav");
const auditForm = document.querySelector("#audit-form");

function closeMenu() {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute("aria-expanded", "false");
  navigation.classList.remove("open");
  document.body.classList.remove("menu-open");
}

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    navigation.classList.toggle("open", !isOpen);
    document.body.classList.toggle("menu-open", !isOpen);
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

function updateHeader() {
  if (header) header.classList.toggle("scrolled", window.scrollY > 16);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const reveals = document.querySelectorAll(".reveal");

if (reduceMotion || !("IntersectionObserver" in window)) {
  reveals.forEach((element) => element.classList.add("visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.13 }
  );

  reveals.forEach((element) => observer.observe(element));
}

if (auditForm) {
  auditForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(auditForm);
    const name = String(data.get("name") || "").trim();
    const business = String(data.get("business") || "").trim();
    const email = String(data.get("email") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const challenge = String(data.get("challenge") || "").trim();

    const subject = `Growth Systems Audit Request — ${business || name}`;
    const body = [
      "Hi Pete,",
      "",
      "I'd like to request a free ARMS REACH Growth Systems Audit.",
      "",
      `Name: ${name}`,
      `Business: ${business}`,
      `Email: ${email}`,
      `Phone: ${phone || "Not provided"}`,
      "",
      "Where leads seem to get stuck:",
      challenge || "I'd like help identifying the gaps.",
      "",
      "Thank you,"
    ].join("\n");

    window.location.href = `mailto:pete@armsreachdigital.agency?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();