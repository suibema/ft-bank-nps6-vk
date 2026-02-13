(() => {

  const BACKEND_URL = "https://functions.yandexcloud.net/d4e1id3b0ckdmjkvt72j";

  const FORM_ID = "nps_2";

  const form = document.getElementById("nps-form");
  const submitBtn = document.getElementById("submit-btn");
  const resultEl = document.getElementById("result");
  const globalErr = document.getElementById("error-global");

  async function getVkUserId() {
    try {
      await vkBridge.send('VKWebAppInit');
      const u = await vkBridge.send('VKWebAppGetUserInfo');
      return (`${u.id}_VK`);
    } catch (err) {
      setGlobalError(err)
    }
  }

  function setGlobalError(msg) {
    globalErr.textContent = msg;
    globalErr.style.display = "block";
  }
  function clearGlobalError() {
    globalErr.textContent = "";
    globalErr.style.display = "none";
  }
  function showResult(msg) {
    resultEl.textContent = msg;
    resultEl.style.display = "block";
  }

  // Снимаем состояние "Не могу оценить" при выборе любой цифры
  function wireNAReset(el) {
    const name = el.dataset.name;
    const naBtn = el.querySelector(".scale-na");
    if (!naBtn) return;

    el.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach((inp) => {
      inp.addEventListener("change", () => {
        naBtn.classList.remove("active");
        naBtn.dataset.value = "";
      });
    });
  }

  function buildScale(el) {
    const name = el.dataset.name;

    const left = el.dataset.left || "1";
    const right = el.dataset.right || "10";
    const hasNA = el.dataset.na === "true";

    // 1..10
    for (let v = 1; v <= 10; v++) {
      const id = `${name}_${v}`;

      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = String(v);
      input.id = id;

      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = String(v);
      label.className = "scale-btn";

      el.appendChild(input);
      el.appendChild(label);
    }

    // подписи по краям (кастомные)
    const hint = document.createElement("div");
    hint.className = "scale-hint";
    hint.innerHTML = `<span>1 — ${left}</span><span>10 — ${right}</span>`;
    el.appendChild(hint);

    // "Не могу оценить" (для нужных вопросов)
    if (hasNA) {
      const naBtn = document.createElement("button");
      naBtn.type = "button";
      naBtn.className = "scale-na";
      naBtn.textContent = "Не могу оценить";
      naBtn.dataset.value = "";

      naBtn.addEventListener("click", () => {
        const isActive = naBtn.classList.toggle("active");
        naBtn.dataset.value = isActive ? "na" : "";

        // если активировали NA — снимаем выбранные цифры
        if (isActive) {
          el.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach((i) => {
            i.checked = false;
          });
        }
      });

      el.appendChild(naBtn);
    }

    wireNAReset(el);
  }

  document.querySelectorAll(".scale").forEach(buildScale);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearGlobalError();
    resultEl.style.display = "none";

    // сброс локальных ошибок
    document.querySelectorAll("[data-err]").forEach((p) => {
      p.textContent = "";
      p.style.display = "none";
    });

    const vkId = getVkUserId();
    if (!vkId) {
      setGlobalError("Не удалось определить vk-id. Откройте миниапп внутри VK.");
      return;
    }

    const answers = {};
    const required = ["q1", "q2", "q7", "q8"];
    let ok = true;

    for (const q of required) {
      const picked = form.querySelector(`input[name="${q}"]:checked`);
      const scaleEl = form.querySelector(`.scale[data-name="${q}"]`);
      const naBtn = scaleEl?.querySelector(".scale-na");
      const naValue = naBtn?.dataset?.value || "";

      if (picked) {
        answers[q] = Number(picked.value);
      } else if (naValue === "na") {
        answers[q] = "na";
      } else {
        const p = form.querySelector(`[data-err="${q}"]`);
        p.textContent = "Выберите оценку от 1 до 10";
        p.style.display = "block";
        ok = false;
      }
    }


    if (!ok) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Отправляю…";

    try {
      const payload = {
        form_id: FORM_ID,
        tg_id: vkId,
        answers
      };

      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setGlobalError(data?.message || `Ошибка: ${res.status}`);
        return;
      }

      showResult(data?.message || "Спасибо! ✅");
    } catch (err) {
      setGlobalError(err?.message || "Ошибка сети при отправке.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Отправить";
    }
  });
})();
