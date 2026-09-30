// Comportements communs du site : menu, bannière cookies, moteur de réservation (fictif), galerie, formulaire de contact
(function () {
  "use strict";

  // En-tête : ombre au défilement
  const entete = document.querySelector(".entete");
  const majEntete = () => entete && entete.classList.toggle("defile", window.scrollY > 8);
  window.addEventListener("scroll", majEntete, { passive: true });
  majEntete();

  // Menu mobile
  const boutonMenu = document.querySelector(".bouton-menu");
  const nav = document.querySelector(".nav");
  if (boutonMenu && nav) {
    const fermerMenu = () => { nav.classList.remove("ouvert"); boutonMenu.setAttribute("aria-expanded", "false"); };
    boutonMenu.addEventListener("click", () => {
      const ouvert = nav.classList.toggle("ouvert");
      boutonMenu.setAttribute("aria-expanded", String(ouvert));
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("ouvert")) { fermerMenu(); boutonMenu.focus(); } });
  }

  // Dates proposées par défaut : arrivée demain, départ deux nuits plus tard
  const iso = (d) => d.toISOString().slice(0, 10);
  const demain = new Date(); demain.setDate(demain.getDate() + 1);
  const apres = new Date(demain); apres.setDate(apres.getDate() + 2);
  document.querySelectorAll("input[data-date='arrivee']").forEach((c) => { c.value = iso(demain); c.min = iso(new Date()); });
  document.querySelectorAll("input[data-date='depart']").forEach((c) => { c.value = iso(apres); c.min = iso(demain); });

  // Moteur de réservation : fenêtre fictive, elle montre où se branche le moteur de l'hôtel
  const moteur = document.getElementById("moteur");
  if (moteur) {
    const champ = (n) => moteur.querySelector(`[name='${n}']`);
    const ouvrir = (source) => {
      const barre = source && source.closest("form.barre-resa");
      if (barre) ["arrivee", "depart", "personnes"].forEach((n) => { champ(n).value = barre.querySelector(`[name='${n}']`).value; });
      const chambre = source && source.dataset.chambre;
      champ("chambre").value = chambre || "";
      moteur.querySelector(".resultat-moteur").classList.remove("visible");
      if (typeof moteur.showModal === "function") moteur.showModal(); else moteur.setAttribute("open", "");
    };
    document.querySelectorAll("[data-reserver]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); ouvrir(b); }));
    document.querySelectorAll("form.barre-resa").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); ouvrir(f.querySelector("[data-reserver]")); }));
    moteur.querySelector(".fermer-moteur").addEventListener("click", () => moteur.close());
    moteur.addEventListener("click", (e) => { if (e.target === moteur) moteur.close(); });
    moteur.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const a = new Date(champ("arrivee").value), d = new Date(champ("depart").value);
      const nuits = Math.round((d - a) / 86400000);
      const res = moteur.querySelector(".resultat-moteur");
      res.textContent = nuits > 0
        ? `Sur le vrai site, le moteur de l'hôtel s'ouvrirait ici avec ces dates (${nuits} nuit${nuits > 1 ? "s" : ""}, ${champ("personnes").value}). Démonstration : aucune réservation n'est enregistrée.`
        : "La date de départ doit suivre la date d'arrivée.";
      res.classList.add("visible");
    });
  }

  // Consentement cookies : choix conservé 6 mois (recommandation CNIL), refuser aussi simple qu'accepter
  const CLE = "consentement-cookies";
  const DUREE = 1000 * 60 * 60 * 24 * 182;
  const lireChoix = () => {
    try {
      const choix = JSON.parse(localStorage.getItem(CLE));
      return choix && Date.now() - choix.date < DUREE ? choix : null;
    } catch { return null; }
  };
  // La mesure d'audience ne se charge qu'après accord explicite
  const appliquer = (choix) => {
    if (choix && choix.mesure && !window.__mesureChargee) {
      window.__mesureChargee = true;
      // Emplacement du script de statistiques : non chargé dans la démonstration
    }
  };
  const enregistrerChoix = (mesure) => {
    const choix = { mesure, date: Date.now() };
    try { localStorage.setItem(CLE, JSON.stringify(choix)); } catch {}
    appliquer(choix);
  };
  const banniere = document.querySelector(".cookies");
  if (banniere) {
    const detail = banniere.querySelector(".cookies-detail");
    const caseMesure = banniere.querySelector("#mesure-audience");
    const montrer = () => {
      const choix = lireChoix();
      if (caseMesure) caseMesure.checked = !!(choix && choix.mesure);
      banniere.classList.add("visible");
    };
    const cacher = () => { banniere.classList.remove("visible"); detail.classList.remove("ouvert"); };
    banniere.querySelector("[data-cookies='accepter']").addEventListener("click", () => { enregistrerChoix(true); cacher(); });
    banniere.querySelector("[data-cookies='refuser']").addEventListener("click", () => { enregistrerChoix(false); cacher(); });
    banniere.querySelector("[data-cookies='personnaliser']").addEventListener("click", () => detail.classList.toggle("ouvert"));
    banniere.querySelector("[data-cookies='enregistrer']").addEventListener("click", () => { enregistrerChoix(caseMesure.checked); cacher(); });
    document.querySelectorAll("[data-gerer-cookies]").forEach((b) => b.addEventListener("click", montrer));
    const choix = lireChoix();
    if (choix) appliquer(choix); else montrer();
  }

  // Galerie : filtre par thème
  const filtres = document.querySelectorAll(".filtre");
  filtres.forEach((f) => f.addEventListener("click", () => {
    filtres.forEach((x) => x.setAttribute("aria-pressed", String(x === f)));
    const theme = f.dataset.theme;
    document.querySelectorAll(".galerie button[data-theme]").forEach((b) => { b.hidden = theme !== "tout" && b.dataset.theme !== theme; });
  }));

  // Galerie : visionneuse (clic ou Entrée, flèches du clavier, glissement du doigt, Échap pour fermer)
  const vision = document.querySelector(".visionneuse");
  if (vision) {
    const img = vision.querySelector("img");
    const legende = vision.querySelector("figcaption");
    const compteur = vision.querySelector(".compteur");
    let liste = [], index = 0, origine = null;
    const afficher = () => {
      const b = liste[index];
      img.src = b.dataset.grande;
      img.alt = b.querySelector("img").alt;
      legende.textContent = b.dataset.legende;
      compteur.textContent = `${index + 1} / ${liste.length}`;
    };
    const ouvrir = (b) => {
      liste = [...document.querySelectorAll(".galerie button")].filter((x) => !x.hidden);
      index = liste.indexOf(b);
      origine = b;
      afficher();
      vision.classList.add("ouverte");
      document.body.classList.add("sans-defilement");
      vision.querySelector(".fermer").focus();
    };
    const fermer = () => {
      vision.classList.remove("ouverte");
      document.body.classList.remove("sans-defilement");
      if (origine) origine.focus();
    };
    const aller = (pas) => { index = (index + pas + liste.length) % liste.length; afficher(); };
    document.querySelectorAll(".galerie button").forEach((b) => b.addEventListener("click", () => ouvrir(b)));
    vision.querySelector(".fermer").addEventListener("click", fermer);
    vision.querySelector(".precedent").addEventListener("click", () => aller(-1));
    vision.querySelector(".suivant").addEventListener("click", () => aller(1));
    vision.addEventListener("click", (e) => { if (e.target === vision) fermer(); });
    document.addEventListener("keydown", (e) => {
      if (!vision.classList.contains("ouverte")) return;
      if (e.key === "Escape") fermer();
      else if (e.key === "ArrowLeft") aller(-1);
      else if (e.key === "ArrowRight") aller(1);
      else if (e.key === "Tab") {
        // Le focus reste dans la visionneuse tant qu'elle est ouverte
        const boutons = [...vision.querySelectorAll("button")];
        const i = boutons.indexOf(document.activeElement);
        e.preventDefault();
        boutons[(i + (e.shiftKey ? -1 : 1) + boutons.length) % boutons.length].focus();
      }
    });
    let departX = null;
    vision.addEventListener("touchstart", (e) => { departX = e.touches[0].clientX; }, { passive: true });
    vision.addEventListener("touchend", (e) => {
      if (departX === null) return;
      const ecart = e.changedTouches[0].clientX - departX;
      if (Math.abs(ecart) > 50) aller(ecart < 0 ? 1 : -1);
      departX = null;
    });
  }

  // Formulaire de contact : vérifié dans le navigateur, rien n'est envoyé dans la démonstration
  const form = document.querySelector("form.formulaire");
  if (form) {
    const verifier = (c) => {
      const bloc = c.closest(".champ");
      if (!bloc) return true;
      let msg = "";
      if (c.required && !c.value.trim()) msg = "Ce champ est obligatoire.";
      else if (c.type === "email" && c.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.value)) msg = "Adresse e-mail invalide.";
      bloc.classList.toggle("invalide", !!msg);
      bloc.querySelector(".erreur").textContent = msg;
      return !msg;
    };
    form.querySelectorAll("input, textarea").forEach((c) => c.addEventListener("blur", () => verifier(c)));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const champs = [...form.querySelectorAll(".champ input, .champ textarea")];
      const ok = champs.map(verifier).every(Boolean);
      const consentement = form.querySelector("#consentement");
      if (!ok) { form.querySelector(".invalide input, .invalide textarea").focus(); return; }
      if (!consentement.checked) { consentement.focus(); consentement.reportValidity && consentement.reportValidity(); return; }
      const message = form.querySelector(".message-envoi");
      message.classList.add("visible");
      message.focus();
    });
  }

  // Année du pied de page
  document.querySelectorAll("[data-annee]").forEach((s) => { s.textContent = new Date().getFullYear(); });
})();
