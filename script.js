const menuToggle = document.getElementById("menuToggle");
const siteNav = document.getElementById("siteNav");
const navLinks = siteNav ? siteNav.querySelectorAll("a") : [];
const yearNode = document.getElementById("year");
const consultForm = document.getElementById("consultForm");
const formMessage = document.getElementById("formMessage");

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    siteNav.classList.toggle("open");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("open");
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const clickedOutside = !siteNav.contains(target) && !menuToggle.contains(target);
    if (clickedOutside) {
      menuToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("open");
    }
  });
}

if (consultForm && formMessage) {
  consultForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!consultForm.checkValidity()) {
      formMessage.textContent = "Please complete all required fields.";
      return;
    }

    const formData = new FormData(consultForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const focus = String(formData.get("focus") || "").trim();
    const message = String(formData.get("message") || "").trim();

    const subject = encodeURIComponent(`Consultation Request - ${name}`);
    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone/WhatsApp: ${phone || "Not provided"}`,
        `Consultation Focus: ${focus}`,
        "",
        "Query:",
        message,
      ].join("\n")
    );

    formMessage.textContent =
      "Request prepared. If your email app does not open, please email consult@pragatitripathi.com directly.";

    window.location.href = `mailto:consult@pragatitripathi.com?subject=${subject}&body=${body}`;
    consultForm.reset();
  });
}
