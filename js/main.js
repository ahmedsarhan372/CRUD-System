(() => {
  const STORAGE_KEY = "crud-system.products.v1";
  const MAX_IMAGE_BYTES = 500 * 1024;

  const form = document.getElementById("productForm");
  const nameInput = document.getElementById("productName");
  const priceInput = document.getElementById("productPrice");
  const categoryInput = document.getElementById("productCategory");
  const descriptionInput = document.getElementById("productDescription");
  const imageInput = document.getElementById("productImg");
  const imagePreviewWrap = document.getElementById("imagePreviewWrap");
  const imagePreview = document.getElementById("imagePreview");
  const imagePreviewName = document.getElementById("imagePreviewName");
  const addButton = document.getElementById("btnAdd");
  const updateButton = document.getElementById("btnUpdate");
  const cancelButton = document.getElementById("btnCancel");
  const searchInput = document.getElementById("search");
  const rowData = document.getElementById("rowData");
  const productCount = document.getElementById("productCount");
  const emptyState = document.getElementById("emptyState");
  const emptyTitle = document.getElementById("emptyTitle");
  const emptyDescription = document.getElementById("emptyDescription");
  const formMessage = document.getElementById("formMessage");

  let products = readProducts();
  let editingId = null;
  let selectedImage = "";
  let existingImage = "";

  function readProducts() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(stored)) return [];
      return stored.filter((item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        Number.isFinite(Number(item.price)) &&
        typeof item.category === "string",
      );
    } catch (error) {
      console.warn("Could not read the saved product catalog.", error);
      return [];
    }
  }

  function persist(nextProducts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProducts));
      products = nextProducts;
      renderProducts();
      return true;
    } catch (error) {
      console.error("Could not save the product catalog.", error);
      showMessage("Could not save this product. Browser storage may be full.", "error");
      return false;
    }
  }

  function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = "form-message" + (type ? " is-" + type : "");
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently added";
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function setPreview(source, name) {
    if (!source) {
      imagePreview.removeAttribute("src");
      imagePreviewWrap.hidden = true;
      imagePreviewName.textContent = "";
      return;
    }
    imagePreview.src = source;
    imagePreviewName.textContent = name || "Current product image";
    imagePreviewWrap.hidden = false;
  }

  function resetForm() {
    form.reset();
    form.classList.remove("was-validated");
    editingId = null;
    selectedImage = "";
    existingImage = "";
    setPreview("", "");
    addButton.classList.remove("d-none");
    updateButton.classList.add("d-none");
    cancelButton.classList.add("d-none");
    showMessage("", "");
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function renderProducts() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const visibleProducts = products
      .filter((product) => {
        const text = [product.name, product.category, product.description, product.price]
          .join(" ")
          .toLocaleLowerCase();
        return text.includes(query);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    productCount.textContent = String(products.length);
    rowData.replaceChildren();

    visibleProducts.forEach((product, index) => {
      const column = makeElement("div", "col-12 col-sm-6 col-xl-4");
      const card = makeElement("article", "card h-100 product-card");
      card.dataset.productId = product.id;

      const imageArea = makeElement("div", "product-image");
      if (product.image) {
        const image = document.createElement("img");
        image.className = "card-img-top";
        image.src = product.image;
        image.alt = product.name;
        image.loading = "lazy";
        image.addEventListener("error", () => {
          image.remove();
          imageArea.append(makeElement("span", "product-placeholder", ""));
          imageArea.lastElementChild.append(makeElement("i", "fa-solid fa-box-open", ""));
        }, { once: true });
        imageArea.append(image);
      } else {
        const placeholder = makeElement("span", "product-placeholder");
        placeholder.append(makeElement("i", "fa-solid fa-box-open", ""));
        imageArea.append(placeholder);
      }

      const body = makeElement("div", "card-body");
      const topLine = makeElement("div", "product-topline");
      topLine.append(makeElement("span", "badge product-badge", product.category));
      topLine.append(makeElement("span", "product-index", "#" + String(index + 1).padStart(2, "0")));
      const title = makeElement("h3", "card-title", product.name);
      const price = makeElement("p", "product-price", Number(product.price).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }));
      price.prepend(makeElement("span", "", "Price"));
      const description = makeElement(
        "p",
        "product-description",
        product.description || "No description added.",
      );
      const date = makeElement("span", "product-date", "Added " + formatDate(product.createdAt));
      body.append(topLine, title, price, description, date);

      const footer = makeElement("div", "card-footer product-actions");
      const edit = makeElement("button", "btn btn-outline-warning btn-sm", "");
      edit.type = "button";
      edit.dataset.action = "edit";
      edit.setAttribute("aria-label", "Edit " + product.name);
      edit.append(makeElement("i", "fa-solid fa-pen-to-square", ""));
      edit.append(document.createTextNode(" Edit"));
      const remove = makeElement("button", "btn btn-outline-danger btn-sm", "");
      remove.type = "button";
      remove.dataset.action = "delete";
      remove.setAttribute("aria-label", "Delete " + product.name);
      remove.append(makeElement("i", "fa-solid fa-trash", ""));
      remove.append(document.createTextNode(" Delete"));
      footer.append(edit, remove);

      card.append(imageArea, body, footer);
      column.append(card);
      rowData.append(column);
    });

    emptyState.hidden = visibleProducts.length > 0;
    if (products.length === 0) {
      emptyTitle.textContent = "Your catalog is ready";
      emptyDescription.textContent = "Add your first product using the form above.";
    } else {
      emptyTitle.textContent = "No matching products";
      emptyDescription.textContent = "Try another search term or clear the search field.";
    }
  }

  function startEditing(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;

    editingId = id;
    existingImage = product.image || "";
    selectedImage = "";
    nameInput.value = product.name;
    priceInput.value = String(product.price);
    categoryInput.value = product.category;
    descriptionInput.value = product.description || "";
    imageInput.value = "";
    form.classList.remove("was-validated");
    addButton.classList.add("d-none");
    updateButton.classList.remove("d-none");
    cancelButton.classList.remove("d-none");
    setPreview(existingImage, existingImage ? "Current product image" : "");
    showMessage("Editing " + product.name, "info");
    nameInput.focus();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function deleteProduct(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    if (!window.confirm("Delete " + product.name + " from your catalog?")) return;

    const nextProducts = products.filter((item) => item.id !== id);
    if (persist(nextProducts)) {
      if (editingId === id) resetForm();
      showMessage("Product deleted.", "success");
    }
  }

  imageInput.addEventListener("change", () => {
    const file = imageInput.files && imageInput.files[0];
    selectedImage = "";
    if (!file) {
      setPreview(editingId ? existingImage : "", editingId && existingImage ? "Current product image" : "");
      return;
    }
    if (!file.type.startsWith("image/")) {
      imageInput.value = "";
      setPreview(editingId ? existingImage : "", editingId && existingImage ? "Current product image" : "");
      showMessage("Choose a valid image file.", "error");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      imageInput.value = "";
      setPreview(editingId ? existingImage : "", editingId && existingImage ? "Current product image" : "");
      showMessage("Choose an image smaller than 500 KB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      selectedImage = typeof reader.result === "string" ? reader.result : "";
      setPreview(selectedImage, file.name);
      showMessage("", "");
    });
    reader.addEventListener("error", () => {
      showMessage("The image could not be read. Please choose it again.", "error");
    });
    reader.readAsDataURL(file);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    form.classList.add("was-validated");
    if (!form.reportValidity()) return;

    const now = new Date().toISOString();
    const previous = editingId ? products.find((item) => item.id === editingId) : null;
    const product = {
      id: editingId || makeId(),
      name: nameInput.value.trim(),
      price: Number(priceInput.value),
      category: categoryInput.value.trim(),
      description: descriptionInput.value.trim(),
      image: selectedImage || (editingId ? existingImage : ""),
      createdAt: previous ? previous.createdAt : now,
      updatedAt: now,
    };
    const nextProducts = previous
      ? products.map((item) => item.id === editingId ? product : item)
      : [product, ...products];

    if (!persist(nextProducts)) return;
    const wasEditing = Boolean(previous);
    resetForm();
    showMessage(wasEditing ? "Product updated successfully." : "Product added successfully.", "success");
  });

  cancelButton.addEventListener("click", resetForm);
  searchInput.addEventListener("input", renderProducts);

  rowData.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-action]") : null;
    const card = target && target.closest("[data-product-id]");
    if (!target || !card) return;
    if (target.dataset.action === "edit") startEditing(card.dataset.productId);
    if (target.dataset.action === "delete") deleteProduct(card.dataset.productId);
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      products = readProducts();
      renderProducts();
    }
  });

  renderProducts();
})();
