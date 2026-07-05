(function () {
  const progressBar = document.getElementById("progressBar");
  const header = document.getElementById("siteHeader");
  const revealItems = document.querySelectorAll(".reveal");
  const hotspots = document.querySelectorAll(".hotspot");
  const mapSteps = document.querySelectorAll(".map-step");
  const poll = document.querySelector("[data-poll]");

  function updateProgress() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const percent = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
    progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.96 && rect.bottom > 0;
    if (alreadyVisible) {
      item.classList.add("in-view");
    } else {
      revealObserver.observe(item);
    }
  });

  function activateHotspot(key) {
    hotspots.forEach((spot) => spot.classList.toggle("is-active", spot.classList.contains(key)));
  }

  const mapObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activateHotspot(entry.target.dataset.target);
        }
      });
    },
    {
      threshold: 0.65,
    }
  );

  mapSteps.forEach((step) => mapObserver.observe(step));
  hotspots.forEach((spot) => {
    spot.addEventListener("mouseenter", () => {
      const direction = Array.from(spot.classList).find((name) => ["east", "west", "south", "north"].includes(name));
      if (direction) activateHotspot(direction);
    });
  });

  const flashcards = document.querySelectorAll(".flashcard");

  function closeFlashcard(card) {
    card.classList.remove("is-expanded");
    card.setAttribute("aria-expanded", "false");
    document.body.classList.remove("has-open-card");
  }

  flashcards.forEach((card) => {
    card.setAttribute("aria-expanded", "false");
    card.addEventListener("click", () => {
      const isOpen = card.classList.contains("is-expanded");
      flashcards.forEach(closeFlashcard);
      if (!isOpen) {
        card.classList.add("is-expanded");
        card.setAttribute("aria-expanded", "true");
        document.body.classList.add("has-open-card");
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      flashcards.forEach(closeFlashcard);
    }
  });

  if (poll) {
    const buttons = Array.from(poll.querySelectorAll(".poll-option"));

    function renderPoll(pickedButton) {
      const total = buttons.reduce((sum, button) => sum + Number(button.dataset.votes || 0), 0);
      buttons.forEach((button) => {
        const votes = Number(button.dataset.votes || 0);
        const percent = total > 0 ? Math.round((votes / total) * 100) : 0;
        button.querySelector("i").style.width = `${percent}%`;
        button.querySelector("strong").textContent = `${button.querySelector("strong").dataset.direction || button.querySelector("strong").textContent} · ${percent}%`;
        button.classList.toggle("is-picked", button === pickedButton);
        button.setAttribute("aria-pressed", button === pickedButton ? "true" : "false");
      });
    }

    buttons.forEach((button) => {
      const strong = button.querySelector("strong");
      strong.dataset.direction = strong.textContent;
      button.setAttribute("type", "button");
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => {
        button.dataset.votes = String(Number(button.dataset.votes || 0) + 1);
        renderPoll(button);
      });
    });

    renderPoll(null);
  }

  document.querySelectorAll("video").forEach((video) => {
    video.play().catch(() => {
      video.removeAttribute("autoplay");
    });
  });

  document.querySelectorAll("img, video").forEach((media) => {
    media.addEventListener(
      "error",
      () => {
        media.classList.add("asset-error");
        console.warn("Không tải được asset:", media.getAttribute("src"));
      },
      { once: true }
    );
  });

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
})();
