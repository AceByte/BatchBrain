"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductionForm } from "./production-form";

type DashboardData = {
  premixes: Array<{
    id: number;
    sourceCocktailId: string;
    name: string;
    isArchived: boolean;
    currentBottles: number;
    thresholdBottles: number;
    targetBottles: number;
    batchYieldBottles: number;
    recipeItems: Array<{
      ingredientName: string;
      amountPerBatch: number;
      unit: string;
    }>;
  }>;
  cocktails: Array<{
    id: number;
    sourceCocktailId: string;
    name: string;
    isArchived: boolean;
    category: "REGULAR" | "SEASONAL" | "SIGNATURE" | "INGREDIENTS";
    glassware: string | null;
    technique: string | null;
    straining: string | null;
    garnish: string | null;
    isBatched: boolean;
    serveExtras: string | null;
    premixNote: string | null;
    batchNote: string | null;
    specs: Array<{
      ingredient: string;
      ml: number;
    }>;
  }>;
  prepPlan: Array<{
    premixId: number;
    premixName: string;
    currentBottles: number;
    thresholdBottles: number;
    targetBottles: number;
    weeklyUseBottles: number;
    projectedEndBottles: number;
    bottlesToProduce: number;
    batchesToMake: number;
    ingredients: Array<{
      ingredientName: string;
      unit: string;
      totalAmount: number;
    }>;
  }>;
  ingredientTotals: Array<{
    ingredientName: string;
    unit: string;
    totalAmount: number;
  }>;
};

function formatCategory(category: DashboardData["cocktails"][number]["category"]) {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

type EditingCocktail = {
  id: number;
  sourceCocktailId: string;
  name: string;
  category: "REGULAR" | "SEASONAL" | "SIGNATURE" | "INGREDIENTS";
  glassware: string | null;
  technique: string | null;
  straining: string | null;
  garnish: string | null;
  isBatched: boolean;
  serveExtras: string | null;
  premixNote: string | null;
  batchNote: string | null;
  specs: Array<{
    ingredient: string;
    ml: number;
  }>;
};

type EditingPremix = {
  id: number;
  sourceCocktailId: string;
  name: string;
  currentBottles: number;
  thresholdBottles: number;
  targetBottles: number;
  batchYieldBottles: number;
  recipeItems: Array<{
    ingredientName: string;
    amountPerBatch: number;
    unit: string;
  }>;
};

type AddCocktailForm = {
  name: string;
  category: "REGULAR" | "SEASONAL" | "SIGNATURE" | "INGREDIENTS";
  glassware: string;
  technique: string;
  straining: string;
  garnish: string;
  isBatched: boolean;
  serveExtras: string;
  premixNote: string;
  batchNote: string;
  specs: Array<{
    ingredient: string;
    ml: number;
  }>;
  createPremix: boolean;
  premixCurrentBottles: number;
  premixThresholdBottles: number;
  premixTargetBottles: number;
  premixRecipeItems: Array<{
    ingredientName: string;
    amountPerBatch: number;
    unit: string;
  }>;
};

type Toast = {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
};

type UndoAdjustment = {
  expiresAt: number;
  changes: Array<{
    id: number;
    oldValue: number;
    newValue: number;
  }>;
};

const CURRENT_VIEW_KEY = "batchbrain.currentView";
const COCKTAIL_SEARCH_KEY = "batchbrain.cocktailSearch";
const PREMIX_SEARCH_KEY = "batchbrain.premixSearch";
const CATEGORY_FILTER_KEY = "batchbrain.categoryFilter";
const PREMIX_SORT_KEY = "batchbrain.premixSort";

function createEmptyAddCocktailForm(): AddCocktailForm {
  return {
    name: "",
    category: "REGULAR",
    glassware: "",
    technique: "",
    straining: "",
    garnish: "",
    isBatched: false,
    serveExtras: "",
    premixNote: "",
    batchNote: "",
    specs: [{ ingredient: "", ml: 0 }],
    createPremix: false,
    premixCurrentBottles: 0,
    premixThresholdBottles: 2,
    premixTargetBottles: 6,
    premixRecipeItems: [{ ingredientName: "", amountPerBatch: 0, unit: "parts" }],
  };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMobile = useIsMobile();
  
  // Draft/edit mode
  const [pendingChanges, setPendingChanges] = useState<Map<number, number>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [showProductionForm, setShowProductionForm] = useState(false);
  const [selectedPremixes, setSelectedPremixes] = useState<Set<number>>(new Set());
  const [selectedArchivedPremixes, setSelectedArchivedPremixes] = useState<Set<number>>(new Set());
  const [selectedCocktails, setSelectedCocktails] = useState<Set<number>>(new Set());
  const [selectedArchivedCocktails, setSelectedArchivedCocktails] = useState<Set<number>>(new Set());
  
  // UI state
  const [cocktailSearch, setCocktailSearch] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem(COCKTAIL_SEARCH_KEY) ?? "";
  });
  const [premixSearch, setPremixSearch] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem(PREMIX_SEARCH_KEY) ?? "";
  });
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "REGULAR" | "SEASONAL" | "SIGNATURE" | "INGREDIENTS">(() => {
    if (typeof window === "undefined") {
      return "ALL";
    }
    const saved = window.localStorage.getItem(CATEGORY_FILTER_KEY);
    if (saved === "ALL" || saved === "REGULAR" || saved === "SEASONAL" || saved === "SIGNATURE" || saved === "INGREDIENTS") {
      return saved;
    }
    return "ALL";
  });
  const [premixSortBy, setPremixSortBy] = useState<"name" | "stock" | "urgency">(() => {
    if (typeof window === "undefined") {
      return "urgency";
    }
    const saved = window.localStorage.getItem(PREMIX_SORT_KEY);
    if (saved === "name" || saved === "stock" || saved === "urgency") {
      return saved;
    }
    return "urgency";
  });
  const [currentView, setCurrentView] = useState<"cocktails" | "inventory" | "prep" | "archive">(() => {
    if (typeof window === "undefined") {
      return "inventory";
    }

    const saved = window.localStorage.getItem(CURRENT_VIEW_KEY);
    if (saved === "cocktails" || saved === "inventory" || saved === "prep" || saved === "archive") {
      return saved;
    }

    return "inventory";
  });
  const [showArchivedPremixes, setShowArchivedPremixes] = useState(false);
  const [showArchivedSpecs, setShowArchivedSpecs] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [undoAdjustment, setUndoAdjustment] = useState<UndoAdjustment | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  
  // Edit modal state
  const [editingCocktail, setEditingCocktail] = useState<EditingCocktail | null>(null);
  const [editingPremix, setEditingPremix] = useState<EditingPremix | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [showAddCocktailModal, setShowAddCocktailModal] = useState(false);
  const [addCocktailForm, setAddCocktailForm] = useState<AddCocktailForm>(createEmptyAddCocktailForm());
  const [addCocktailSaving, setAddCocktailSaving] = useState(false);
  const [addCocktailError, setAddCocktailError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const viewOrder: Array<"cocktails" | "inventory" | "prep" | "archive"> = ["cocktails", "inventory", "prep", "archive"];
  const currentViewIndex = viewOrder.indexOf(currentView);

  const viewTitles: Record<"cocktails" | "inventory" | "prep" | "archive", string> = {
    cocktails: "🍸 Spec Sheet",
    inventory: "💧 Inventory",
    prep: "📋 Prep List",
    archive: "📦 Archive",
  };

  function pushToast(kind: Toast["kind"], message: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3400);
  }

  function shouldIgnoreCardToggle(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(target.closest("button, input, textarea, select, a, [data-no-card-toggle='true']"));
  }

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load dashboard data");
      }
      const json = (await response.json()) as DashboardData;
      const normalized: DashboardData = {
        ...json,
        premixes: (json.premixes ?? []).map((premix) => ({
          ...premix,
          recipeItems: Array.isArray(premix.recipeItems) ? premix.recipeItems : [],
        })),
        cocktails: (json.cocktails ?? []).map((cocktail) => ({
          ...cocktail,
          specs: Array.isArray(cocktail.specs) ? cocktail.specs : [],
        })),
        prepPlan: json.prepPlan ?? [],
        ingredientTotals: json.ingredientTotals ?? [],
      };
      setData(normalized);
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CURRENT_VIEW_KEY, currentView);
  }, [currentView]);

  useEffect(() => {
    window.localStorage.setItem(COCKTAIL_SEARCH_KEY, cocktailSearch);
  }, [cocktailSearch]);

  useEffect(() => {
    window.localStorage.setItem(PREMIX_SEARCH_KEY, premixSearch);
  }, [premixSearch]);

  useEffect(() => {
    window.localStorage.setItem(CATEGORY_FILTER_KEY, categoryFilter);
  }, [categoryFilter]);

  useEffect(() => {
    window.localStorage.setItem(PREMIX_SORT_KEY, premixSortBy);
  }, [premixSortBy]);

  useEffect(() => {
    if (!undoAdjustment) {
      setUndoSecondsLeft(0);
      return;
    }

    const tick = () => {
      const seconds = Math.max(0, Math.ceil((undoAdjustment.expiresAt - Date.now()) / 1000));
      setUndoSecondsLeft(seconds);
      if (seconds <= 0) {
        setUndoAdjustment(null);
      }
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [undoAdjustment]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyboard(e: KeyboardEvent) {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (pendingChanges.size > 0 && !isSaving) {
          savePendingChanges();
        }
      }
      // Escape to discard with confirmation
      if (e.key === 'Escape' && pendingChanges.size > 0) {
        if (confirm(`Discard ${pendingChanges.size} pending change(s)?`)) {
          discardPendingChanges();
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [pendingChanges, isSaving]);


  function adjustStock(premixId: number, deltaBottles: number) {
    // Get current pending value or fall back to original
    const original = data?.premixes.find(p => p.id === premixId)?.currentBottles ?? 0;
    const currentPending = pendingChanges.get(premixId) ?? original;
    const newValue = Math.max(0, currentPending + deltaBottles);
    
    if (newValue === original) {
      // If back to original, remove from pending changes
      const updated = new Map(pendingChanges);
      updated.delete(premixId);
      setPendingChanges(updated);
    } else {
      // Store the new value
      setPendingChanges(prev => new Map(prev).set(premixId, newValue));
    }
  }

  function setStockValue(premixId: number, newValue: number) {
    const original = data?.premixes.find(p => p.id === premixId)?.currentBottles ?? 0;
    const value = Math.max(0, newValue);
    
    if (value === original) {
      // If back to original, remove from pending changes
      const updated = new Map(pendingChanges);
      updated.delete(premixId);
      setPendingChanges(updated);
    } else {
      // Store the new value
      setPendingChanges(prev => new Map(prev).set(premixId, value));
    }
  }

  async function setArchiveState(
    type: "premix" | "cocktail",
    id: string,
    archived: boolean,
  ) {
    setArchiveTarget(`${type}:${id}`);
    try {
      const response = await fetch("/api/archive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, archived }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to update archive state");
      }

      await loadData();
      pushToast("success", archived ? `Archived ${type} (and linked item)` : `Restored ${type} (and linked item)`);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Failed to update archive state";
      setError(
        message,
      );
      pushToast("error", message);
    } finally {
      setArchiveTarget(null);
    }
  }

  async function savePendingChanges() {
    if (pendingChanges.size === 0) return;
    
    setIsSaving(true);
    try {
      const changes = Array.from(pendingChanges.entries()).map(([id, newValue]) => {
        const original = data?.premixes.find(p => p.id === id);
        return {
          id,
          newValue,
          deltaBottles: newValue - (original?.currentBottles ?? 0),
        };
      });

      const response = await fetch("/api/premix/batch-adjust", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          changes,
          notes: adjustmentNotes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to save changes");
      }

      setPendingChanges(new Map());
      setAdjustmentNotes("");
      setUndoAdjustment({
        expiresAt: Date.now() + 10000,
        changes: changes.map((change) => ({
          id: change.id,
          oldValue: change.newValue - change.deltaBottles,
          newValue: change.newValue,
        })),
      });
      await loadData();
      pushToast("success", "Saved stock adjustments");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Failed to save changes";
      setError(
        message,
      );
      pushToast("error", message);
    } finally {
      setIsSaving(false);
    }
  }

  function discardPendingChanges() {
    setPendingChanges(new Map());
  }

  async function undoLastAdjustment() {
    if (!undoAdjustment || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/premix/batch-adjust", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changes: undoAdjustment.changes.map((change) => ({
            id: change.id,
            newValue: change.oldValue,
            deltaBottles: change.oldValue - change.newValue,
          })),
          notes: "Undo previous adjustment",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to undo adjustment");
      }

      setUndoAdjustment(null);
      await loadData();
      pushToast("success", "Reverted last adjustment");
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Failed to undo adjustment";
      pushToast("error", message);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveEditingCocktail() {
    if (!editingCocktail) return;

    setEditSaving(true);
    setEditError(null);
    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "cocktail",
          id: editingCocktail.sourceCocktailId,
          data: {
            name: editingCocktail.name,
            category: editingCocktail.category,
            glassware: editingCocktail.glassware || null,
            technique: editingCocktail.technique || null,
            straining: editingCocktail.straining || null,
            garnish: editingCocktail.garnish || null,
            isBatched: editingCocktail.isBatched,
            serveExtras: editingCocktail.serveExtras || null,
            premixNote: editingCocktail.premixNote || null,
            batchNote: editingCocktail.batchNote || null,
            specs: editingCocktail.specs,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Failed to save cocktail");
      }

      setEditingCocktail(null);
      await loadData();
      pushToast("success", "Cocktail saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save cocktail";
      setEditError(message);
      pushToast("error", message);
    } finally {
      setEditSaving(false);
    }
  }

  async function saveEditingPremix() {
    if (!editingPremix) return;

    setEditSaving(true);
    setEditError(null);
    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "premix",
          id: editingPremix.sourceCocktailId,
          data: {
            name: editingPremix.name,
            currentBottles: editingPremix.currentBottles,
            thresholdBottles: editingPremix.thresholdBottles,
            targetBottles: editingPremix.targetBottles,
            batchYieldBottles: editingPremix.batchYieldBottles,
            recipeItems: editingPremix.recipeItems,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Failed to save premix");
      }

      setEditingPremix(null);
      await loadData();
      pushToast("success", "Premix saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save premix";
      setEditError(message);
      pushToast("error", message);
    } finally {
      setEditSaving(false);
    }
  }

  function openAddCocktailModal() {
    setAddCocktailForm(createEmptyAddCocktailForm());
    setAddCocktailError(null);
    setShowAddCocktailModal(true);
  }

  async function createCocktail() {
    if (!addCocktailForm.name.trim()) {
      setAddCocktailError("Cocktail name is required");
      pushToast("error", "Cocktail name is required");
      return;
    }

    const validSpecs = addCocktailForm.specs
      .map((item) => ({ ingredient: item.ingredient.trim(), ml: Number(item.ml) || 0 }))
      .filter((item) => item.ingredient.length > 0);

    if (validSpecs.length === 0) {
      setAddCocktailError("Add at least one ingredient line in Specs");
      pushToast("error", "Add at least one ingredient line in Specs");
      return;
    }

    const validPremixRecipeItems = addCocktailForm.premixRecipeItems
      .map((item) => ({
        ingredientName: item.ingredientName.trim(),
        amountPerBatch: Number(item.amountPerBatch) || 0,
        unit: (item.unit || "parts").trim() || "parts",
      }))
      .filter((item) => item.ingredientName.length > 0);

    if (addCocktailForm.createPremix && validPremixRecipeItems.length === 0) {
      setAddCocktailError("Premix recipe needs at least one ingredient when Create as premix is enabled");
      pushToast("error", "Premix recipe needs at least one ingredient when Create as premix is enabled");
      return;
    }

    setAddCocktailSaving(true);
    setAddCocktailError(null);

    try {
      const response = await fetch("/api/cocktails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addCocktailForm.name.trim(),
          category: addCocktailForm.category,
          glassware: addCocktailForm.glassware.trim() || null,
          technique: addCocktailForm.technique.trim() || null,
          straining: addCocktailForm.straining.trim() || null,
          garnish: addCocktailForm.garnish.trim() || null,
          isBatched: addCocktailForm.isBatched,
          serveExtras: addCocktailForm.serveExtras.trim() || null,
          premixNote: addCocktailForm.premixNote.trim() || null,
          batchNote: addCocktailForm.batchNote.trim() || null,
          specs: validSpecs,
          createPremix: addCocktailForm.createPremix,
          premix: addCocktailForm.createPremix
            ? {
                currentBottles: Number(addCocktailForm.premixCurrentBottles) || 0,
                thresholdBottles: Number(addCocktailForm.premixThresholdBottles) || 0,
                targetBottles: Number(addCocktailForm.premixTargetBottles) || 0,
                recipeItems: validPremixRecipeItems,
              }
            : null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to create cocktail");
      }

      setShowAddCocktailModal(false);
      setAddCocktailForm(createEmptyAddCocktailForm());
      await loadData();
      pushToast("success", addCocktailForm.createPremix ? "Cocktail and premix created" : "Cocktail created");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Failed to create cocktail";
      setAddCocktailError(
        message,
      );
      pushToast("error", message);
    } finally {
      setAddCocktailSaving(false);
    }
  }

  function togglePremixSelection(id: number) {
    const newSelection = new Set(selectedPremixes);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedPremixes(newSelection);
  }

  function selectAllPremixes() {
    setSelectedPremixes(new Set(visibleActivePremixes.map((p) => p.id)));
    pushToast("info", "Selected all active premixes");
  }

  function clearSelection() {
    setSelectedPremixes(new Set());
    pushToast("info", "Selection cleared");
  }

  function toggleCocktailSelection(id: number) {
    setSelectedCocktails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleArchivedPremixSelection(id: number) {
    setSelectedArchivedPremixes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleArchivedCocktailSelection(id: number) {
    setSelectedArchivedCocktails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function applyBulkAdjustment(delta: number) {
    if (selectedPremixes.size === 0) return;
    
    // Apply batch-sized adjustments
    selectedPremixes.forEach(id => {
      const premix = data?.premixes.find(p => p.id === id);
      if (premix) {
        // Calculate delta in batches, not individual bottles
        const batchAdjustment = delta * premix.batchYieldBottles;
        adjustStock(id, batchAdjustment);
      }
    });
    
    clearSelection();
  }

  async function bulkArchiveOrRestorePremixes(ids: Set<number>, archived: boolean) {
    if (!data || ids.size === 0) return;

    const targetPremixes = data.premixes.filter((premix) => ids.has(premix.id));
    if (targetPremixes.length === 0) return;

    setArchiveTarget("bulk:premix");
    try {
      for (const premix of targetPremixes) {
        const response = await fetch("/api/archive", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "premix", id: premix.sourceCocktailId, archived }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Bulk premix archive update failed");
        }
      }

      setSelectedPremixes(new Set());
      setSelectedArchivedPremixes(new Set());
      await loadData();
      pushToast("success", archived ? `Archived ${targetPremixes.length} premix items` : `Restored ${targetPremixes.length} premix items`);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Bulk premix action failed";
      pushToast("error", message);
    } finally {
      setArchiveTarget(null);
    }
  }

  async function bulkArchiveOrRestoreCocktails(ids: Set<number>, archived: boolean) {
    if (!data || ids.size === 0) return;

    const targetCocktails = data.cocktails.filter((cocktail) => ids.has(cocktail.id));
    if (targetCocktails.length === 0) return;

    setArchiveTarget("bulk:cocktail");
    try {
      for (const cocktail of targetCocktails) {
        const response = await fetch("/api/archive", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "cocktail", id: cocktail.sourceCocktailId, archived }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Bulk cocktail archive update failed");
        }
      }

      setSelectedCocktails(new Set());
      setSelectedArchivedCocktails(new Set());
      await loadData();
      pushToast("success", archived ? `Archived ${targetCocktails.length} cocktails` : `Restored ${targetCocktails.length} cocktails`);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Bulk cocktail action failed";
      pushToast("error", message);
    } finally {
      setArchiveTarget(null);
    }
  }

  async function bulkEditCocktailCategory(category: DashboardData["cocktails"][number]["category"]) {
    if (!data || selectedCocktails.size === 0) return;

    const targetCocktails = data.cocktails.filter((cocktail) => selectedCocktails.has(cocktail.id));
    if (targetCocktails.length === 0) return;

    setEditSaving(true);
    try {
      for (const cocktail of targetCocktails) {
        const response = await fetch("/api/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "cocktail",
            id: cocktail.sourceCocktailId,
            data: {
              name: cocktail.name,
              category,
              glassware: cocktail.glassware,
              technique: cocktail.technique,
              straining: cocktail.straining,
              garnish: cocktail.garnish,
              isBatched: cocktail.isBatched,
              serveExtras: cocktail.serveExtras,
              premixNote: cocktail.premixNote,
              batchNote: cocktail.batchNote,
              specs: cocktail.specs,
            },
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Bulk category update failed");
        }
      }

      setSelectedCocktails(new Set());
      await loadData();
      pushToast("success", `Updated category for ${targetCocktails.length} cocktails`);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Bulk category update failed";
      pushToast("error", message);
    } finally {
      setEditSaving(false);
    }
  }

  const lowPremixCount = useMemo(
    () =>
      data?.prepPlan.filter((item) => item.projectedEndBottles < item.thresholdBottles)
        .length ?? 0,
    [data],
  );
  
  // Filtered and sorted data
  const filteredCocktails = useMemo(() => {
    if (!data) return [];
    
    let filtered = data.cocktails.filter((cocktail) => !cocktail.isArchived);
    
    // Apply category filter
    if (categoryFilter !== "ALL") {
      filtered = filtered.filter(c => c.category === categoryFilter);
    }
    
    // Apply search
    if (cocktailSearch) {
      const search = cocktailSearch.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.specs.some(s => s.ingredient.toLowerCase().includes(search))
      );
    }
    
    // Estimate card height and sort for balanced columns
    return filtered.sort((a, b) => {
      const estimateHeight = (cocktail: typeof data.cocktails[0]) => {
        let height = 60; // Base height for name/category
        
        // Details section height
        const detailsCount = (cocktail.glassware ? 1 : 0) + (cocktail.technique ? 1 : 0) + (cocktail.garnish ? 1 : 0);
        if (detailsCount > 0) {
          height += 20 + (detailsCount * 24) + 16; // header + items + padding
        }
        
        // Ingredients section height
        const ingredientCount = cocktail.specs.length + (cocktail.serveExtras ? 1 : 0);
        if (ingredientCount > 0) {
          height += 20 + (ingredientCount * 24) + 16; // header + items + padding
        }
        
        return height;
      };
      
      return estimateHeight(b) - estimateHeight(a); // Descending (tallest first)
    });
  }, [data, categoryFilter, cocktailSearch]);

  const archivedCocktails = useMemo(() => {
    if (!data) return [];

    return data.cocktails
      .filter((cocktail) => cocktail.isArchived)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);
  
  const sortedPremixes = useMemo(() => {
    if (!data) return [];
    
    const premixes = data.premixes.map(p => ({
      ...p,
      currentBottles: pendingChanges.has(p.id) ? pendingChanges.get(p.id)! : p.currentBottles,
    }));
    
    switch (premixSortBy) {
      case "name":
        return premixes.sort((a, b) => a.name.localeCompare(b.name));
      case "stock":
        return premixes.sort((a, b) => a.currentBottles - b.currentBottles);
      case "urgency":
        return premixes.sort((a, b) => {
          const aUrgent = a.currentBottles < a.thresholdBottles;
          const bUrgent = b.currentBottles < b.thresholdBottles;
          if (aUrgent && !bUrgent) return -1;
          if (!aUrgent && bUrgent) return 1;
          return (a.currentBottles / a.thresholdBottles) - (b.currentBottles / b.thresholdBottles);
        });
      default:
        return premixes;
    }
  }, [data, premixSortBy, pendingChanges]);

  const activePremixes = useMemo(
    () => sortedPremixes.filter((premix) => !premix.isArchived),
    [sortedPremixes],
  );

  const visibleActivePremixes = useMemo(() => {
    const query = premixSearch.trim().toLowerCase();
    if (!query) {
      return activePremixes;
    }

    return activePremixes.filter((premix) => {
      if (premix.name.toLowerCase().includes(query)) {
        return true;
      }

      return premix.recipeItems.some((item) => item.ingredientName.toLowerCase().includes(query));
    });
  }, [activePremixes, premixSearch]);

  const archivedPremixes = useMemo(
    () => sortedPremixes.filter((premix) => premix.isArchived),
    [sortedPremixes],
  );

  const premixSpecsByName = useMemo(() => {
    const premixMap = new Map<string, DashboardData["premixes"][number]>();
    if (!data) {
      return premixMap;
    }

    for (const premix of data.premixes) {
      premixMap.set(premix.name.toLowerCase().trim(), premix);
    }

    return premixMap;
  }, [data]);

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative w-full max-w-sm rounded-3xl bg-slate-900/65 p-7 text-center shadow-2xl ring-1 ring-slate-600/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 ring-1 ring-slate-600">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-500 border-t-emerald-300" />
          </div>
          <p className="mt-5 text-base font-bold tracking-wide text-slate-100">Loading BatchBrain data...</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Syncing cocktails, premixes, and prep</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-4">
        <div className="max-w-md rounded-3xl bg-gradient-to-br from-red-50 to-rose-50 p-8 shadow-2xl ring-2 ring-red-300">
          <div className="flex items-center gap-4">
            <span className="text-4xl">❌</span>
            <p className="text-2xl font-extrabold text-red-800">Unable to load dashboard</p>
          </div>
          <p className="mt-4 text-sm font-medium text-red-700">{error ?? "Unknown error"}</p>
          <button
            onClick={loadData}
            className="mt-6 w-full rounded-xl bg-gradient-to-br from-red-600 to-rose-700 px-6 py-3 font-bold text-white shadow-lg transition-all hover:shadow-xl hover:from-red-700 hover:to-rose-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className={`mx-auto flex w-full flex-col gap-4 ${isMobile ? "p-2 pb-36 md:p-6 lg:p-8" : "p-4 md:p-6 lg:p-8"}`}>
        {/* Top Toolbar */}
        <div className={`flex flex-wrap items-center justify-between gap-2 print:hidden ${isMobile ? "gap-2" : "gap-4"}`}>
          <div className={`flex items-center gap-2 ${isMobile ? "w-full" : ""}`}>
            <button
              onClick={loadData}
              disabled={loading}
              className={`rounded-xl bg-slate-800 text-white shadow-lg ring-1 ring-slate-700 transition-all hover:bg-slate-700 hover:shadow-xl disabled:opacity-50 ${isMobile ? "px-2 py-1.5 text-xs" : "px-5 py-2.5 text-sm"} font-semibold`}
              title="Refresh data (F5)"
            >
              🔄 {isMobile ? "Refresh" : "Refresh"}
            </button>
            {lastUpdated && (
              <span className={`font-medium text-slate-400 ${isMobile ? "text-xs" : "text-sm"}`}>
                {isMobile ? "Updated" : "Last updated"}: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openAddCocktailModal}
              className={`rounded-xl bg-emerald-700 text-white shadow-lg ring-1 ring-emerald-600 transition-all hover:bg-emerald-600 hover:shadow-xl font-semibold ${isMobile ? "px-2 py-1.5 text-xs" : "px-5 py-2.5 text-sm"}`}
            >
              ➕ {isMobile ? "Add" : "Add Cocktail"}
            </button>
            <a
              href="/analytics"
              className={`rounded-xl bg-slate-800 text-white shadow-lg ring-1 ring-slate-700 transition-all hover:bg-slate-700 hover:shadow-xl font-semibold ${isMobile ? "px-2 py-1.5 text-xs" : "px-5 py-2.5 text-sm"}`}
            >
              📊 {isMobile ? "Analytics" : "Analytics"}
            </a>
            <a
              href="/print"
              className={`rounded-xl bg-slate-800 text-white shadow-lg ring-1 ring-slate-700 transition-all hover:bg-slate-700 hover:shadow-xl font-semibold ${isMobile ? "px-2 py-1.5 text-xs" : "px-5 py-2.5 text-sm"}`}
            >
              🖨️ {isMobile ? "Print" : "Print & Export"}
            </a>
          </div>
        </div>

        <header className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-blue-950/70 to-slate-900/90 shadow-xl ring-1 ring-slate-700/70 backdrop-blur-sm print:border-slate-300 print:bg-white print:text-slate-900 ${isMobile ? "p-2" : "p-3"}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-indigo-500/10"></div>
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className={`font-extrabold tracking-tight text-white print:text-slate-900 ${isMobile ? "text-xl" : "text-2xl"}`}>BatchBrain</h1>
              {lowPremixCount > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200 backdrop-blur-sm">
                  <span className="text-[10px]">⚠</span>
                  <span>{lowPremixCount} item{lowPremixCount !== 1 ? 's' : ''} low</span>
                </div>
              )}
              {pendingChanges.size > 0 && (
                <div className="mt-0.5 inline-flex items-center gap-0.5 rounded px-2 py-0.5 bg-yellow-400 text-xs font-semibold text-yellow-900">
                  <span>✏️</span>
                  <span>{pendingChanges.size} pending</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 sm:flex-row">
              {!isMobile && pendingChanges.size > 0 && (
                <>
                  <button
                    onClick={savePendingChanges}
                    disabled={isSaving}
                    className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white shadow-lg ring-1 ring-emerald-400/40 transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 print:hidden"
                    title="Save changes (Ctrl+S)"
                  >
                    {isSaving ? "Saving..." : "💾 Save"}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Discard ${pendingChanges.size} pending change(s)?`)) {
                        discardPendingChanges();
                      }
                    }}
                    disabled={isSaving}
                    className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white shadow-lg ring-1 ring-rose-400/40 transition-all hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50 print:hidden"
                    title="Discard changes (Esc)"
                  >
                    ✕ Discard
                  </button>
                </>
              )}
            </div>
          </div>

          {!isMobile && pendingChanges.size > 0 && (
            <div className="mt-4 grid gap-4 rounded-2xl border border-white/10 bg-slate-900/45 p-4 backdrop-blur-lg ring-1 ring-slate-700/60 print:hidden">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-100">
                  Notes (optional):
                </label>
                <input
                  type="text"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="Additional details..."
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/90 px-4 py-2.5 text-sm text-slate-100 shadow-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                />
              </div>
            </div>
          )}
        </header>

        {isMobile && (
          <div className="sticky top-2 z-40 rounded-2xl border border-white/10 bg-slate-900/90 p-2 shadow-xl ring-1 ring-slate-700/70 backdrop-blur-xl print:hidden">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-extrabold text-white">{viewTitles[currentView]}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tab Controls</p>
            </div>

            {currentView === "inventory" && (
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="text"
                  value={premixSearch}
                  onChange={(e) => setPremixSearch(e.target.value)}
                  placeholder="Search premixes or ingredients..."
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-xs text-white ring-1 ring-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={premixSortBy}
                    onChange={(e) => setPremixSortBy(e.target.value as "name" | "stock" | "urgency")}
                    className="rounded-lg bg-slate-800 px-2 py-2 text-xs font-semibold text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="urgency">Urgency</option>
                    <option value="name">Name</option>
                    <option value="stock">Stock</option>
                  </select>
                  <button
                    onClick={() => setShowProductionForm(true)}
                    className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 px-2 py-2 text-xs font-bold text-white"
                  >
                    📦 Log Production
                  </button>
                </div>
              </div>
            )}

            {currentView === "cocktails" && (
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="text"
                  value={cocktailSearch}
                  onChange={(e) => setCocktailSearch(e.target.value)}
                  placeholder="Search cocktails..."
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 text-xs text-white ring-1 ring-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as "ALL" | "REGULAR" | "SEASONAL" | "SIGNATURE" | "INGREDIENTS")}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Categories</option>
                  <option value="REGULAR">Regular</option>
                  <option value="SEASONAL">Seasonal</option>
                  <option value="SIGNATURE">Signature</option>
                  <option value="INGREDIENTS">Ingredients</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className={`grid gap-2 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4`}>
          <div className={`group rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 shadow-md ring-1 ring-slate-600 transition-all hover:shadow-lg ${isMobile ? "p-2" : "p-3"}`}>
            <p className={`font-semibold uppercase tracking-wider text-slate-400 text-xs`}>Total Premixes</p>
            <p className={`mt-0.5 font-extrabold text-white ${isMobile ? "text-lg" : "text-xl"}`}>{activePremixes.length}</p>
            <p className="text-xs font-semibold text-slate-400">Archived: {archivedPremixes.length}</p>
          </div>
          <div className={`group rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 shadow-md ring-1 ring-slate-600 transition-all hover:shadow-lg ${isMobile ? "p-2" : "p-3"}`}>
            <p className={`font-semibold uppercase tracking-wider text-slate-400 text-xs`}>Total Cocktails</p>
            <p className={`mt-0.5 font-extrabold text-white ${isMobile ? "text-lg" : "text-xl"}`}>{data.cocktails.length - archivedCocktails.length}</p>
            <p className="text-xs font-semibold text-slate-400">Archived: {archivedCocktails.length}</p>
          </div>
          <div className={`group rounded-lg bg-gradient-to-br from-blue-900 to-indigo-900 shadow-md ring-1 ring-blue-700 transition-all hover:shadow-lg ${isMobile ? "p-2" : "p-3"}`}>
            <p className={`font-semibold uppercase tracking-wider text-blue-300 text-xs`}>Batches Needed</p>
            <p className={`mt-0.5 font-extrabold text-blue-100 ${isMobile ? "text-lg" : "text-xl"}`}>
              {data?.prepPlan.reduce((sum, item) => sum + item.batchesToMake, 0) ?? 0}
            </p>
          </div>
          <div className={`group rounded-lg shadow-md ring-1 transition-all hover:shadow-lg ${isMobile ? "p-2" : "p-3"} ${
            lowPremixCount > 0 
              ? 'bg-gradient-to-br from-red-900 to-rose-900 ring-red-700' 
              : 'bg-gradient-to-br from-green-900 to-emerald-900 ring-green-700'
          }`}>
            <p className={`font-semibold uppercase tracking-wider text-xs ${
              lowPremixCount > 0 ? 'text-red-300' : 'text-green-300'
            }`}>Low Stock Items</p>
            <p className={`mt-0.5 font-extrabold ${isMobile ? "text-lg" : "text-xl"} ${
              lowPremixCount > 0 ? 'text-red-100' : 'text-green-100'
            }`}>
              {lowPremixCount}
            </p>
          </div>
        </div>

        {isMobile && pendingChanges.size > 0 && (
          <div className="fixed bottom-16 left-2 right-2 z-50 rounded-xl border border-amber-400/40 bg-slate-900/95 p-2 shadow-xl ring-1 ring-amber-300/30 backdrop-blur-lg print:hidden">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-bold text-amber-200">{pendingChanges.size} unsaved changes</p>
              <p className="text-[11px] font-semibold text-slate-400">Sticky quick actions</p>
            </div>
            <div className="mb-2">
              <input
                type="text"
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                placeholder="Notes (optional)..."
                className="w-full rounded-lg border border-slate-600 bg-slate-800/90 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={savePendingChanges}
                disabled={isSaving}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Discard ${pendingChanges.size} pending change(s)?`)) {
                    discardPendingChanges();
                  }
                }}
                disabled={isSaving}
                className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {undoAdjustment && undoSecondsLeft > 0 && (
          <div className="fixed bottom-28 left-2 right-2 z-50 rounded-xl border border-blue-400/40 bg-slate-900/95 p-2 shadow-xl ring-1 ring-blue-300/30 backdrop-blur-lg print:hidden sm:left-auto sm:right-4 sm:w-80">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-blue-100">Adjustment saved. Undo available for {undoSecondsLeft}s.</p>
              <button
                onClick={undoLastAdjustment}
                disabled={isSaving}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                Undo
              </button>
            </div>
          </div>
        )}

        {isMobile ? (
          <nav className="fixed bottom-2 left-2 right-2 z-50 rounded-2xl border border-white/10 bg-slate-900/95 p-1.5 shadow-xl ring-1 ring-slate-700/80 backdrop-blur-lg print:hidden">
            <div className="grid grid-cols-4 gap-1">
              {viewOrder.map((view) => {
                const isActive = currentView === view;
                return (
                  <button
                    key={`mobile-tab-${view}`}
                    onClick={() => setCurrentView(view)}
                    className={`rounded-xl px-1 py-2 text-[11px] font-bold transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <span className="block text-xs">{viewTitles[view].split(" ")[0]}</span>
                    <span className="block mt-0.5 leading-none">{viewTitles[view].replace(/^\S+\s*/, "")}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        ) : (
          <div className="flex items-center justify-between rounded-lg bg-slate-800/80 p-1.5 shadow-md ring-1 ring-slate-700 print:hidden">
            <button
              onClick={() => setCurrentView(viewOrder[(currentViewIndex - 1 + viewOrder.length) % viewOrder.length])}
              className="rounded-lg bg-slate-700 px-2 py-1 text-sm font-semibold text-white ring-1 ring-slate-600 transition-all hover:bg-slate-600"
            >
              ←
            </button>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">View</p>
              <p className="text-sm font-extrabold text-white">{viewTitles[currentView]}</p>
            </div>
            <button
              onClick={() => setCurrentView(viewOrder[(currentViewIndex + 1) % viewOrder.length])}
              className="rounded-lg bg-slate-700 px-2 py-1 text-sm font-semibold text-white ring-1 ring-slate-600 transition-all hover:bg-slate-600"
            >
              →
            </button>
          </div>
        )}

      {currentView === "inventory" && (
      <section className={`rounded-3xl bg-slate-800 shadow-2xl ring-1 ring-slate-700 ${isMobile ? "p-4" : "p-8"}`}>
        <div className={`flex flex-wrap items-center justify-between gap-2 ${isMobile ? "gap-2" : "gap-4"}`}>
          <h2 className={`font-bold text-white ${isMobile ? "text-lg" : "text-2xl"}`}>💧 Premix Inventory</h2>
          {!isMobile && (
          <div className={`flex items-center gap-2 ${isMobile ? "w-full flex-wrap" : "gap-3"}`}>
            <input
              type="text"
              value={premixSearch}
              onChange={(e) => setPremixSearch(e.target.value)}
              placeholder="Search premixes or ingredients..."
              className={`rounded-xl bg-slate-700 text-white ring-1 ring-slate-600 transition-all placeholder:text-slate-400 focus:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? "w-full px-3 py-1.5 text-xs" : "w-72 px-4 py-2.5 text-sm"}`}
            />
            <button
              onClick={() => setShowProductionForm(true)}
              className={`rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md transition-all hover:shadow-lg print:hidden font-semibold ${isMobile ? "px-2 py-1.5 text-xs" : "px-5 py-2.5 text-sm"}`}
            >
              📦 Log Production
            </button>
            <label className={`font-semibold text-slate-300 ${isMobile ? "text-xs" : "text-sm"}`}>Sort by:</label>
            <select 
              value={premixSortBy}
              onChange={(e) => setPremixSortBy(e.target.value as any)}
              className={`rounded-xl bg-slate-700 text-white ring-1 ring-slate-600 transition-all hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${isMobile ? "px-2 py-1.5 text-xs" : "px-4 py-2.5 text-sm"}`}
            >
              <option value="urgency">Urgency</option>
              <option value="name">Name</option>
              <option value="stock">Stock Level</option>
            </select>
          </div>
          )}
        </div>
        <p className={`mt-2 font-medium text-slate-400 ${isMobile ? "text-xs" : "text-sm"}`}>
          Showing {visibleActivePremixes.length} of {activePremixes.length} active premixes
        </p>

        {/* Bulk operations toolbar */}
        {selectedPremixes.size > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 p-5 shadow-inner ring-1 ring-blue-700 print:hidden">
            <span className="text-lg font-bold text-blue-100">
              {selectedPremixes.size} selected
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => applyBulkAdjustment(-1)}
                className="rounded-xl bg-gradient-to-br from-red-500 to-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg"
              >
                -1 Batch
              </button>
              <button
                onClick={() => applyBulkAdjustment(1)}
                className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg"
              >
                +1 Batch
              </button>
              <button
                onClick={() => applyBulkAdjustment(2)}
                className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg"
              >
                +2 Batches
              </button>
              <button
                onClick={() => bulkArchiveOrRestorePremixes(selectedPremixes, true)}
                disabled={archiveTarget === "bulk:premix"}
                className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-600 disabled:opacity-50"
              >
                Archive Selected
              </button>
            </div>
            <div className="ml-auto flex gap-3">
              <button
                onClick={selectAllPremixes}
                className="text-sm font-semibold text-blue-200 transition-colors hover:text-blue-100"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="text-sm font-semibold text-blue-200 transition-colors hover:text-blue-100"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {visibleActivePremixes.map((premix) => {
                const isLow = premix.currentBottles < premix.thresholdBottles;
                const isCritical = premix.currentBottles < premix.thresholdBottles * 0.5;
                const hasChange = pendingChanges.has(premix.id);
                const isSelected = selectedPremixes.has(premix.id);
                const originalValue = data?.premixes.find(p => p.id === premix.id)?.currentBottles ?? 0;
                const cardClass = isCritical 
                  ? 'bg-red-900/30 border-l-4 border-red-500' 
                  : isLow 
                  ? 'bg-amber-900/30 border-l-4 border-amber-500' 
                  : hasChange
                  ? 'bg-blue-900/30 border-l-4 border-blue-500'
                  : 'bg-slate-900/50 border-l-4 border-transparent';
                
                return (
                  <div
                    key={premix.id}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={(e) => {
                      if (shouldIgnoreCardToggle(e.target)) {
                        return;
                      }
                      togglePremixSelection(premix.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) {
                        return;
                      }
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        togglePremixSelection(premix.id);
                      }
                    }}
                    className={`rounded-lg p-3 ring-1 transition-all hover:bg-slate-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${cardClass} ${isSelected ? "ring-emerald-400/90 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]" : "ring-slate-700"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <div className="flex items-start gap-2 flex-1">
                          {isSelected && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-400/40">
                              Selected
                            </span>
                          )}
                          {isCritical && <span className="text-lg">🔴</span>}
                          {isLow && !isCritical && <span className="text-lg">🟡</span>}
                          {hasChange && <span className="text-lg">✏️</span>}
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-white text-sm">{premix.name}</p>
                              <div className="ml-auto flex gap-1">
                                <button
                                  onClick={() => setEditingPremix({...premix})}
                                  className="rounded bg-blue-700 px-2 py-0.5 text-xs font-semibold text-blue-100 transition-colors hover:bg-blue-600"
                                  title="Edit this premix"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setArchiveState("premix", premix.sourceCocktailId, true)}
                                  disabled={archiveTarget === `premix:${premix.sourceCocktailId}`}
                                  className="rounded bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-600 disabled:opacity-50"
                                  title="Move to archived premixes"
                                >
                                  Archive
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-2 md:items-start">
                      {premix.recipeItems.length > 0 && (
                        <div className="rounded bg-slate-900/70 p-1.5 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                          <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-300">Ingredients:</p>
                          <ul className="space-y-0.5">
                            {premix.recipeItems.map((item, itemIndex) => (
                              <li
                                key={`${premix.id}-${item.ingredientName}-${itemIndex}`}
                                className="flex items-center justify-between rounded bg-slate-800/60 px-1.5 py-0.5 text-sm leading-5"
                              >
                                <span className="font-semibold text-slate-100">{item.ingredientName}</span>
                                <span className="font-extrabold text-blue-300">{item.amountPerBatch}{item.unit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className={`rounded bg-slate-900/70 p-1.5 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm ${premix.recipeItems.length === 0 ? 'md:col-span-2' : ''}`}>
                        <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-300">Stats:</p>
                        <ul className="space-y-0.5">
                          <li className="flex items-center justify-between rounded bg-slate-800/60 px-1.5 py-0.5 text-sm leading-5">
                            <span className="font-semibold text-slate-100">Current</span>
                            <span className={`font-extrabold ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-blue-300'}`}>
                              {premix.currentBottles.toFixed(2)}
                              {hasChange && (
                                <span className="ml-1 text-slate-500">({originalValue.toFixed(2)})</span>
                              )}
                            </span>
                          </li>
                          <li className="flex items-center justify-between rounded bg-slate-800/60 px-1.5 py-0.5 text-sm leading-5">
                            <span className="font-semibold text-slate-100">Threshold</span>
                            <span className="font-extrabold text-blue-300">{premix.thresholdBottles.toFixed(2)}</span>
                          </li>
                          <li className="flex items-center justify-between rounded bg-slate-800/60 px-1.5 py-0.5 text-sm leading-5">
                            <span className="font-semibold text-slate-100">Target</span>
                            <span className="font-extrabold text-blue-300">{premix.targetBottles.toFixed(2)}</span>
                          </li>
                          <li className="flex items-center justify-between rounded bg-slate-800/60 px-1.5 py-0.5 text-sm leading-5">
                            <span className="font-semibold text-slate-100">Batch Yield</span>
                            <span className="font-extrabold text-blue-300">{premix.batchYieldBottles.toFixed(2)}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className={`mt-2 flex items-stretch print:hidden ${isMobile ? 'gap-1' : 'gap-2'}`}>
                      <button
                        className={`flex-1 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 ${isMobile ? 'py-1.5 text-sm' : 'py-2.5 text-base'}`}
                        onClick={() => adjustStock(premix.id, -5)}
                      >
                        -5
                      </button>
                      <button
                        className={`flex-1 rounded-lg bg-gradient-to-br from-red-400 to-red-500 font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 ${isMobile ? 'py-1.5 text-sm' : 'py-2.5 text-base'}`}
                        onClick={() => adjustStock(premix.id, -1)}
                      >
                        -1
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={pendingChanges.get(premix.id) ?? (data?.premixes.find(p => p.id === premix.id)?.currentBottles ?? 0)}
                        onChange={(e) => setStockValue(premix.id, Number(e.target.value))}
                        className={`rounded-lg bg-slate-700 text-center font-bold text-white shadow-sm ring-1 ring-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? 'w-16 px-2 py-1.5 text-sm' : 'w-24 px-3 py-2.5 text-base'}`}
                      />
                      <button
                        className={`flex-1 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 ${isMobile ? 'py-1.5 text-sm' : 'py-2.5 text-base'}`}
                        onClick={() => adjustStock(premix.id, 1)}
                      >
                        +1
                      </button>
                      <button
                        className={`flex-1 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 ${isMobile ? 'py-1.5 text-sm' : 'py-2.5 text-base'}`}
                        onClick={() => adjustStock(premix.id, 5)}
                      >
                        +5
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
          {visibleActivePremixes.length === 0 && (
            <div className="mt-4 rounded-2xl bg-slate-900/60 p-6 text-center ring-1 ring-slate-700/70">
              <p className="text-sm font-bold text-slate-200">No premixes match your search</p>
              <p className="mt-1 text-xs font-medium text-slate-400">Try a different name or ingredient keyword</p>
            </div>
          )}

      </section>
      )}

      {currentView === "cocktails" && (
      <section className={`rounded-3xl bg-slate-800 shadow-2xl ring-1 ring-slate-700 ${isMobile ? "p-4" : "p-8"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className={`font-bold text-white ${isMobile ? "text-lg" : "text-2xl"}`}>🍸 Cocktail Specsheet</h2>
        </div>
        {!isMobile && (
        <div className={`flex flex-wrap gap-2 ${isMobile ? "gap-2 mt-4" : "mt-6 gap-3"}`}>
          <input
            type="text"
            placeholder="Search cocktails..."
            value={cocktailSearch}
            onChange={(e) => setCocktailSearch(e.target.value)}
            className={`flex-1 rounded-xl bg-slate-700 text-white ring-1 ring-slate-600 transition-all placeholder:text-slate-400 focus:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isMobile ? "min-w-[150px] px-3 py-2 text-xs" : "min-w-[200px] px-5 py-3 text-sm"}`}
          />
          <div className="flex flex-wrap gap-2">
            {["ALL", "REGULAR", "SEASONAL", "SIGNATURE", "INGREDIENTS"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat as any)}
                className={`rounded-xl font-semibold transition-all ${isMobile ? "px-2 py-1.5 text-xs" : "px-5 py-2.5 text-sm"} ${
                  categoryFilter === cat
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'bg-slate-700 text-slate-200 ring-1 ring-slate-600 hover:bg-slate-600 hover:shadow-sm'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        )}
        <div className={`font-medium text-slate-400 ${isMobile ? "text-xs mt-2" : "text-sm mt-2"}`}>
          Showing {filteredCocktails.length} of {data.cocktails.length - archivedCocktails.length} active cocktails
        </div>

        {selectedCocktails.size > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 p-4 shadow-inner ring-1 ring-blue-700 print:hidden">
            <span className="text-sm font-bold text-blue-100">{selectedCocktails.size} cocktails selected</span>
            <button
              onClick={() => bulkArchiveOrRestoreCocktails(selectedCocktails, true)}
              disabled={archiveTarget === "bulk:cocktail"}
              className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-600 disabled:opacity-50"
            >
              Archive Selected
            </button>
            <div className="flex gap-2">
              {(["REGULAR", "SEASONAL", "SIGNATURE", "INGREDIENTS"] as const).map((category) => (
                <button
                  key={`bulk-cat-${category}`}
                  onClick={() => bulkEditCocktailCategory(category)}
                  disabled={editSaving}
                  className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-blue-100 hover:bg-blue-600 disabled:opacity-50"
                >
                  Set {category}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setSelectedCocktails(new Set(filteredCocktails.map((cocktail) => cocktail.id)))}
                className="text-xs font-semibold text-blue-200 hover:text-blue-100"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedCocktails(new Set())}
                className="text-xs font-semibold text-blue-200 hover:text-blue-100"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {filteredCocktails.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 p-10 text-center ring-1 ring-slate-600">
            <p className="text-base font-bold text-slate-300">No cocktails found</p>
            <p className="mt-2 text-xs font-medium text-slate-400">Try adjusting your search or filters</p>
          </div>
        ) : (
        <div className={`grid gap-3 mt-4 ${isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
          {filteredCocktails
            .sort((a, b) => {
              // Calculate content length for sorting
              const getContentLength = (cocktail: typeof filteredCocktails[0]) => {
                let length = 0;
                // Count details
                if (cocktail.glassware) length++;
                if (cocktail.technique) length++;
                if (cocktail.garnish) length++;
                // Count premix lines
                if (cocktail.isBatched && cocktail.premixNote) {
                  length += cocktail.premixNote.split('\n').length;
                }
                // Count ingredients
                length += cocktail.specs.length;
                // Count serve extras
                if (cocktail.serveExtras) length++;
                return length;
              };
              return getContentLength(b) - getContentLength(a); // Descending (most content first)
            })
            .map((cocktail) => {
            const isSelected = selectedCocktails.has(cocktail.id);
            const categoryColors = {
              REGULAR: 'bg-gradient-to-r from-blue-900/40 to-blue-800/20 ring-blue-700/50',
              SEASONAL: 'bg-gradient-to-r from-purple-900/40 to-purple-800/20 ring-purple-700/50',
              SIGNATURE: 'bg-gradient-to-r from-amber-900/40 to-amber-800/20 ring-amber-700/50',
              INGREDIENTS: 'bg-gradient-to-r from-emerald-900/40 to-teal-800/20 ring-emerald-700/50',
            };
            const categoryBadgeColors = {
              REGULAR: 'bg-gradient-to-br from-blue-900 to-blue-800 text-blue-200 ring-1 ring-blue-700',
              SEASONAL: 'bg-gradient-to-br from-purple-900 to-purple-800 text-purple-200 ring-1 ring-purple-700',
              SIGNATURE: 'bg-gradient-to-br from-amber-900 to-amber-800 text-amber-200 ring-1 ring-amber-700',
              INGREDIENTS: 'bg-gradient-to-br from-emerald-900 to-teal-800 text-emerald-200 ring-1 ring-emerald-700',
            };
            const categoryEmoji = {
              REGULAR: '🥃',
              SEASONAL: '🌸',
              SIGNATURE: '⭐',
              INGREDIENTS: '🧂',
            };
            const specRows = cocktail.specs.map((spec, idx) => ({
              spec,
              idx,
            }));
            
            return (
              <article 
                key={cocktail.id} 
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={(e) => {
                  if (shouldIgnoreCardToggle(e.target)) {
                    return;
                  }
                  toggleCocktailSelection(cocktail.id);
                }}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) {
                    return;
                  }
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    toggleCocktailSelection(cocktail.id);
                  }
                }}
                className={`group rounded-lg ${categoryColors[cocktail.category]} p-2.5 shadow-md ring-1 transition-all hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${isSelected ? "ring-2 !ring-emerald-300 shadow-[0_0_0_2px_rgba(16,185,129,0.55)]" : ""}`}
              >
                <div className="grid gap-2 grid-cols-1">
                  {/* Left column: Name and category */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isSelected && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-400/40">
                          Selected
                        </span>
                      )}
                      <h3 className="text-sm font-extrabold text-white">{cocktail.name}</h3>
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold ${categoryBadgeColors[cocktail.category]}`}>
                        <span>{categoryEmoji[cocktail.category]}</span>
                        {formatCategory(cocktail.category)}
                      </span>
                      {cocktail.isBatched && (
                        <div className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-br from-green-900 to-emerald-900 px-1.5 py-0.5 text-xs font-bold text-green-200 ring-1 ring-green-700">
                          <span>📦</span>
                          Batched
                        </div>
                      )}
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={() => setEditingCocktail({...cocktail})}
                          className="rounded bg-blue-700 px-2 py-0.5 text-xs font-semibold text-blue-100 transition-colors hover:bg-blue-600"
                          title="Edit this cocktail spec"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setArchiveState("cocktail", cocktail.sourceCocktailId, true)}
                          disabled={archiveTarget === `cocktail:${cocktail.sourceCocktailId}`}
                          className="rounded bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-600 disabled:opacity-50"
                          title="Move this spec to archived specs"
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                    
                    {/* Cocktail Details (Glass, Technique, Garnish) */}
                    {(cocktail.glassware || cocktail.technique || cocktail.garnish) && (
                      <div className="rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">Details</p>
                        <ul className="space-y-1">
                          {cocktail.glassware && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">Glass</span>
                                <span className="ml-2 font-extrabold text-blue-300">{cocktail.glassware}</span>
                              </div>
                            </li>
                          )}
                          {cocktail.technique && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">Technique</span>
                                <span className="ml-5 font-extrabold text-blue-300">{cocktail.technique}</span>
                              </div>
                            </li>
                          )}
                          {cocktail.garnish && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">Garnish</span>
                                <span className="ml-2 font-extrabold text-blue-300">{cocktail.garnish}</span>
                              </div>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Premix - Only for batched cocktails with premixNote */}
                    {cocktail.isBatched && cocktail.premixNote && (
                      <div className="rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">Premix</p>
                        <ul className="space-y-1">
                          {cocktail.premixNote.split('\n').map((line, idx) => {
                            // Parse "amount ingredient" format (e.g., "7cl Premix" → amount: "7cl", ingredient: "Premix")
                            const match = line.match(/^([0-9.]+\s*[a-zA-Z]+)\s+(.+)$/);
                            const amount = match ? match[1].trim() : '';
                            const ingredient = match ? match[2].trim() : line;
                            
                            return (
                              <li
                                key={`${cocktail.id}-premix-line-${idx}`}
                                className="rounded-md bg-slate-800/70 px-2 py-1"
                              >
                                <div className="flex items-center justify-between text-xs leading-5">
                                  <span className="font-semibold text-slate-100">{ingredient}</span>
                                  {amount && <span className="font-extrabold text-blue-300">{amount}</span>}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* Ingredients */}
                    {(specRows.length > 0 || cocktail.serveExtras) && (
                      <div className="rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">Ingredients</p>
                        <ul className="space-y-1">
                          {specRows.map(({ spec, idx }) => (
                            <li
                              key={`${cocktail.id}-${spec.ingredient}-${idx}`}
                              className="rounded-md bg-slate-800/70 px-2 py-1"
                            >
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">{spec.ingredient}</span>
                                <span className="font-extrabold text-blue-300">{spec.ml}ml</span>
                              </div>
                            </li>
                          ))}
                          {cocktail.serveExtras && (
                            cocktail.serveExtras.split(/[,\n]/).map((line, idx) => {
                              const trimmedLine = line.trim();
                              if (!trimmedLine) return null; // Skip empty lines
                              
                              return (
                                <li
                                  key={`${cocktail.id}-serve-extra-${idx}`}
                                  className="rounded-md bg-slate-800/70 px-2 py-1"
                                >
                                  <div className="flex items-center justify-between text-xs leading-5">
                                    <span className="font-semibold text-slate-100"></span>
                                    <span className="ml-2 font-extrabold text-blue-300">{trimmedLine}</span>
                                  </div>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        )}

      </section>
      )}

      {currentView === "prep" && (
      <section className={`rounded-3xl bg-slate-800 shadow-2xl ring-1 ring-slate-700 ${isMobile ? "p-4" : "p-8"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className={`font-bold text-white ${isMobile ? "text-lg" : "text-2xl"}`}>📋 Prep List (This Week)</h2>
        </div>

        {(() => {
          const bottlesNeeded = data.prepPlan.reduce((total, item) => {
            const bottlesForThisItem = item.ingredients.reduce((sum, ing) => {
              const ingNameLower = ing.ingredientName.toLowerCase();
              const emptyBottleIngredients = ['juice', 'honey syrup', 'espresso martini', 'spice mix', 'passionfruit puree'];
              const waterSugarIngredients = ['water', 'sugar'];
              
              if (emptyBottleIngredients.some(name => ingNameLower.includes(name.toLowerCase()))) {
                return sum + ing.totalAmount;
              }
              
              // For water and sugar, check they don't contain syrup or "still water"
              if (waterSugarIngredients.some(name => ingNameLower.includes(name.toLowerCase()))) {
                if (!ingNameLower.includes('syrup') && !ingNameLower.includes('still water')) {
                  return sum + ing.totalAmount;
                }
              }
              
              return sum;
            }, 0);
            return total + bottlesForThisItem;
          }, 0);

          return bottlesNeeded > 0 && (
            <div className="mt-4 rounded-lg bg-blue-900/40 ring-1 ring-blue-700 p-3">
              <p className="text-sm font-semibold text-blue-200">
                🍾 Empty Bottles Needed: <span className="text-lg font-bold text-blue-100">{Math.ceil(bottlesNeeded)}</span>
              </p>
            </div>
          );
        })()}

        {data.prepPlan.filter(item => item.batchesToMake > 0).length === 0 ? (
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-green-900 to-emerald-900 p-8 text-center ring-1 ring-green-700">
            <p className="text-base font-bold text-green-200">✓ All stock levels are good!</p>
            <p className="mt-2 text-sm font-medium text-green-300">No prep needed this week.</p>
          </div>
        ) : (
        <div className="mt-6 space-y-4">
          {(() => {
            const prepItems = data.prepPlan.filter(item => item.batchesToMake > 0);
            const criticalItems = prepItems.filter(item => item.projectedEndBottles < item.thresholdBottles * 0.5);
            const urgentItems = prepItems.filter(item => item.projectedEndBottles < item.thresholdBottles && item.projectedEndBottles >= item.thresholdBottles * 0.5);
            const normalItems = prepItems.filter(item => item.projectedEndBottles >= item.thresholdBottles);
            
            return (
              <>
                {criticalItems.length > 0 && (
                  <div className="rounded-2xl bg-gradient-to-br from-red-900 to-rose-900 ring-2 ring-red-700 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-red-800 to-rose-800 px-6 py-3">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>🔴</span>
                        Critical - {criticalItems.length} item{criticalItems.length !== 1 ? 's' : ''}
                      </h3>
                    </div>
                    <div className="p-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                      {criticalItems.map((item) => (
                        <div key={item.premixId} className="rounded-lg bg-slate-900/50 p-3 hover:bg-slate-900/70 transition-all">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <p className="font-bold text-white text-sm">{item.premixName}</p>
                              <p className="text-xs text-slate-300 mt-0.5">Current: {item.currentBottles.toFixed(2)} → {item.projectedEndBottles.toFixed(2)} (threshold: {item.thresholdBottles.toFixed(2)})</p>
                            </div>
                            <div className="bg-red-600 rounded-lg px-4 py-2 text-center whitespace-nowrap">
                              <p className="text-xs font-bold text-white">Make</p>
                              <p className="text-lg font-black text-red-100">{item.batchesToMake}</p>
                            </div>
                          </div>
                          {item.ingredients.length > 0 && (
                            <div className="ml-0 pt-2 border-t border-slate-700">
                              <ul className="grid gap-1 grid-cols-1">
                                {item.ingredients.map((ing, idx) => (
                                  <li key={`${item.premixId}-${ing.ingredientName}-${idx}`} className="text-xs text-slate-300 flex items-center gap-2">
                                    <span className="text-slate-500">•</span>
                                    <span className="font-semibold text-slate-100">{ing.ingredientName}:</span>
                                    <span className="text-slate-400">{ing.totalAmount.toFixed(2)}{ing.unit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {urgentItems.length > 0 && (
                  <div className="rounded-2xl bg-gradient-to-br from-amber-900 to-orange-900 ring-2 ring-amber-700 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-800 to-orange-800 px-6 py-3">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>⚠️</span>
                        Urgent - {urgentItems.length} item{urgentItems.length !== 1 ? 's' : ''}
                      </h3>
                    </div>
                    <div className="p-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                      {urgentItems.map((item) => (
                        <div key={item.premixId} className="rounded-lg bg-slate-900/50 p-3 hover:bg-slate-900/70 transition-all">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <p className="font-bold text-white text-sm">{item.premixName}</p>
                              <p className="text-xs text-slate-300 mt-0.5">Current: {item.currentBottles.toFixed(2)} → {item.projectedEndBottles.toFixed(2)} (threshold: {item.thresholdBottles.toFixed(2)})</p>
                            </div>
                            <div className="bg-amber-600 rounded-lg px-4 py-2 text-center whitespace-nowrap">
                              <p className="text-xs font-bold text-white">Make</p>
                              <p className="text-lg font-black text-amber-100">{item.batchesToMake}</p>
                            </div>
                          </div>
                          {item.ingredients.length > 0 && (
                            <div className="ml-0 pt-2 border-t border-slate-700">
                              <ul className="grid gap-1 grid-cols-1">
                                {item.ingredients.map((ing, idx) => (
                                  <li key={`${item.premixId}-${ing.ingredientName}-${idx}`} className="text-xs text-slate-300 flex items-center gap-2">
                                    <span className="text-slate-500">•</span>
                                    <span className="font-semibold text-slate-100">{ing.ingredientName}:</span>
                                    <span className="text-slate-400">{ing.totalAmount.toFixed(2)}{ing.unit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {normalItems.length > 0 && (
                  <div className="rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 ring-1 ring-blue-700 shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-800 to-indigo-800 px-6 py-3">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>📦</span>
                        Regular - {normalItems.length} item{normalItems.length !== 1 ? 's' : ''}
                      </h3>
                    </div>
                    <div className="p-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                      {normalItems.map((item) => (
                        <div key={item.premixId} className="rounded-lg bg-slate-900/50 p-3 hover:bg-slate-900/70 transition-all">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <p className="font-bold text-white text-sm">{item.premixName}</p>
                              <p className="text-xs text-slate-300 mt-0.5">Current: {item.currentBottles.toFixed(2)} → {item.projectedEndBottles.toFixed(2)} (threshold: {item.thresholdBottles.toFixed(2)})</p>
                            </div>
                            <div className="bg-blue-600 rounded-lg px-4 py-2 text-center whitespace-nowrap">
                              <p className="text-xs font-bold text-white">Make</p>
                              <p className="text-lg font-black text-blue-100">{item.batchesToMake}</p>
                            </div>
                          </div>
                          {item.ingredients.length > 0 && (
                            <div className="ml-0 pt-2 border-t border-slate-700">
                              <ul className="grid gap-1 grid-cols-1">
                                {item.ingredients.map((ing, idx) => (
                                  <li key={`${item.premixId}-${ing.ingredientName}-${idx}`} className="text-xs text-slate-300 flex items-center gap-2">
                                    <span className="text-slate-500">•</span>
                                    <span className="font-semibold text-slate-100">{ing.ingredientName}:</span>
                                    <span className="text-slate-400">{ing.totalAmount.toFixed(2)}{ing.unit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
        )}

        <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900/30 to-indigo-900/30 p-4 shadow-md ring-1 ring-slate-700">
          <h3 className="text-base font-bold text-white mb-3">🛍️ Shopping List</h3>
          {data.ingredientTotals.length === 0 ? (
            <p className="text-center text-xs font-semibold text-slate-400">No ingredients needed - all stock levels are good! ✓</p>
          ) : (
            <ul className="grid gap-2 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {data.ingredientTotals.map((ingredient, idx) => (
                <li 
                  key={`${ingredient.ingredientName}-${ingredient.unit}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/60 px-3 py-2 ring-1 ring-slate-700 text-xs transition-all hover:bg-slate-800"
                >
                  <span className="font-semibold text-white">{ingredient.ingredientName}</span>
                  <span className="font-bold text-blue-300">{ingredient.totalAmount.toFixed(2)}{ingredient.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      )}

      {currentView === "archive" && (
      <section className={`rounded-3xl bg-slate-800 shadow-2xl ring-1 ring-slate-700 ${isMobile ? "p-4" : "p-8"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className={`font-bold text-white ${isMobile ? "text-lg" : "text-2xl"}`}>📦 Archive</h2>
          <p className="text-sm font-medium text-slate-400">
            Manage old premixes and specs. Restore any item to make it active again.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-slate-900/40 p-4 ring-1 ring-slate-700">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-200">Archived Premixes ({archivedPremixes.length})</h3>
            <div className="flex items-center gap-2">
              {selectedArchivedPremixes.size > 0 && (
                <>
                  <button
                    onClick={() => bulkArchiveOrRestorePremixes(selectedArchivedPremixes, false)}
                    disabled={archiveTarget === "bulk:premix"}
                    className="rounded bg-blue-700 px-3 py-1 text-xs font-semibold text-blue-100 transition-colors hover:bg-blue-600 disabled:opacity-50"
                  >
                    Restore Selected ({selectedArchivedPremixes.size})
                  </button>
                  <button
                    onClick={() => setSelectedArchivedPremixes(new Set())}
                    className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-600"
                  >
                    Clear
                  </button>
                </>
              )}
              <button
                onClick={() => setShowArchivedPremixes((value) => !value)}
                className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-600"
              >
                {showArchivedPremixes ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {showArchivedPremixes && (
            archivedPremixes.length === 0 ? (
              <p className="mt-3 text-sm font-medium text-slate-400">No archived premixes yet.</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {archivedPremixes.map((premix) => {
                  const isSelected = selectedArchivedPremixes.has(premix.id);
                  return (
                  <div
                    key={`archived-${premix.id}`}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={(e) => {
                      if (shouldIgnoreCardToggle(e.target)) {
                        return;
                      }
                      toggleArchivedPremixSelection(premix.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) {
                        return;
                      }
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleArchivedPremixSelection(premix.id);
                      }
                    }}
                    className={`rounded-lg bg-slate-900/60 p-3 ring-1 transition-all hover:bg-slate-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${isSelected ? "ring-emerald-400/90 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]" : "ring-slate-700"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {isSelected && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-400/40">
                          Selected
                        </span>
                      )}
                      <p className="font-semibold text-slate-200 text-sm">{premix.name}</p>
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={() => setEditingPremix({...premix})}
                          className="rounded bg-amber-700 px-2 py-0.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-600"
                          title="Edit this archived premix"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setArchiveState("premix", premix.sourceCocktailId, false)}
                          disabled={archiveTarget === `premix:${premix.sourceCocktailId}`}
                          className="rounded bg-blue-700 px-2 py-0.5 text-xs font-semibold text-blue-100 transition-colors hover:bg-blue-600 disabled:opacity-50"
                          title="Restore premix to active inventory"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2 md:items-start">
                      {premix.recipeItems.length > 0 && (
                        <div className="rounded bg-slate-900/70 p-1.5 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                          <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-300">Ingredients:</p>
                          <ul className="space-y-0.5">
                            {premix.recipeItems.map((item, idx) => (
                              <li
                                key={`${premix.id}-archived-recipe-${idx}`}
                                className="flex items-center justify-between rounded bg-slate-800/60 px-1.5 py-0.5 text-sm leading-5"
                              >
                                <span className="font-semibold text-slate-100">{item.ingredientName}</span>
                                <span className="font-extrabold text-blue-300">{item.amountPerBatch}{item.unit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className={`rounded bg-slate-900/70 p-1.5 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm ${premix.recipeItems.length === 0 ? 'md:col-span-2' : ''}`}>
                        <p className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-300">Stats:</p>
                        <ul className="space-y-0.5">
                          <li className="flex items-center justify-between rounded bg-slate-800/60 px-1.5 py-0.5 text-sm leading-5">
                            <span className="font-semibold text-slate-100">Current</span>
                            <span className="font-extrabold text-blue-300">{premix.currentBottles.toFixed(2)}</span>
                          </li>
                          <li className="flex items-center justify-between rounded bg-slate-800/60 px-1.5 py-0.5 text-sm leading-5">
                            <span className="font-semibold text-slate-100">Threshold</span>
                            <span className="font-extrabold text-blue-300">{premix.thresholdBottles.toFixed(2)}</span>
                          </li>
                          <li className="flex items-center justify-between rounded bg-slate-800/60 px-1.5 py-0.5 text-sm leading-5">
                            <span className="font-semibold text-slate-100">Target</span>
                            <span className="font-extrabold text-blue-300">{premix.targetBottles.toFixed(2)}</span>
                          </li>
                          <li className="flex items-center justify-between rounded bg-slate-800/60 px-1.5 py-0.5 text-sm leading-5">
                            <span className="font-semibold text-slate-100">Batch Yield</span>
                            <span className="font-extrabold text-blue-300">{premix.batchYieldBottles.toFixed(2)}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )
          )}
        </div>

        <div className="mt-6 rounded-xl bg-slate-900/40 p-4 ring-1 ring-slate-700">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-200">Archived Specs ({archivedCocktails.length})</h3>
            <div className="flex items-center gap-2">
              {selectedArchivedCocktails.size > 0 && (
                <>
                  <button
                    onClick={() => bulkArchiveOrRestoreCocktails(selectedArchivedCocktails, false)}
                    disabled={archiveTarget === "bulk:cocktail"}
                    className="rounded bg-blue-700 px-3 py-1 text-xs font-semibold text-blue-100 transition-colors hover:bg-blue-600 disabled:opacity-50"
                  >
                    Restore Selected ({selectedArchivedCocktails.size})
                  </button>
                  <button
                    onClick={() => setSelectedArchivedCocktails(new Set())}
                    className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-600"
                  >
                    Clear
                  </button>
                </>
              )}
              <button
                onClick={() => setShowArchivedSpecs((value) => !value)}
                className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-600"
              >
                {showArchivedSpecs ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {showArchivedSpecs && (
            archivedCocktails.length === 0 ? (
              <p className="mt-3 text-sm font-medium text-slate-400">No archived specs yet.</p>
            ) : (
              <div className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {archivedCocktails.map((cocktail) => {
                  const isSelected = selectedArchivedCocktails.has(cocktail.id);
                  return (
                  <article
                    key={`archived-cocktail-${cocktail.id}`}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={(e) => {
                      if (shouldIgnoreCardToggle(e.target)) {
                        return;
                      }
                      toggleArchivedCocktailSelection(cocktail.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) {
                        return;
                      }
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleArchivedCocktailSelection(cocktail.id);
                      }
                    }}
                    className={`rounded-lg bg-slate-900/60 p-3 ring-1 transition-all hover:bg-slate-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${isSelected ? "ring-emerald-400/90 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]" : "ring-slate-700"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {isSelected && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-400/40">
                          Selected
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-100">{cocktail.name}</p>
                        <p className="text-xs font-medium text-slate-400">{formatCategory(cocktail.category)}</p>
                      </div>
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={() => setEditingCocktail({...cocktail})}
                          className="rounded bg-amber-700 px-2 py-0.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-600"
                          title="Edit this archived cocktail spec"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setArchiveState("cocktail", cocktail.sourceCocktailId, false)}
                          disabled={archiveTarget === `cocktail:${cocktail.sourceCocktailId}`}
                          className="rounded bg-blue-700 px-2 py-0.5 text-xs font-semibold text-blue-100 transition-colors hover:bg-blue-600 disabled:opacity-50"
                          title="Restore this spec to active list"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-400">
                      {cocktail.specs.length} ingredient line{cocktail.specs.length === 1 ? "" : "s"}
                    </p>

                    {(cocktail.glassware || cocktail.technique || cocktail.straining || cocktail.garnish) && (
                      <div className="mt-2 rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">Details</p>
                        <ul className="space-y-1">
                          {cocktail.glassware && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">Glass</span>
                                <span className="ml-2 font-extrabold text-blue-300">{cocktail.glassware}</span>
                              </div>
                            </li>
                          )}
                          {cocktail.technique && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">Technique</span>
                                <span className="ml-5 font-extrabold text-blue-300">{cocktail.technique}</span>
                              </div>
                            </li>
                          )}
                          {cocktail.straining && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">Straining</span>
                                <span className="ml-2 font-extrabold text-blue-300">{cocktail.straining}</span>
                              </div>
                            </li>
                          )}
                          {cocktail.garnish && (
                            <li className="rounded-md bg-slate-800/70 px-2 py-1">
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">Garnish</span>
                                <span className="ml-2 font-extrabold text-blue-300">{cocktail.garnish}</span>
                              </div>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {cocktail.isBatched && cocktail.premixNote && (
                      <div className="mt-2 rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">Premix</p>
                        <ul className="space-y-1">
                          {cocktail.premixNote.split('\n').map((line, idx) => {
                            const match = line.match(/^([0-9.]+\s*[a-zA-Z]+)\s+(.+)$/);
                            const amount = match ? match[1].trim() : '';
                            const ingredient = match ? match[2].trim() : line;

                            return (
                              <li
                                key={`${cocktail.id}-archived-premix-line-${idx}`}
                                className="rounded-md bg-slate-800/70 px-2 py-1"
                              >
                                <div className="flex items-center justify-between text-xs leading-5">
                                  <span className="font-semibold text-slate-100">{ingredient}</span>
                                  {amount && <span className="font-extrabold text-blue-300">{amount}</span>}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {cocktail.specs.length > 0 && (
                      <div className="mt-2 rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-300">Ingredients</p>
                        <ul className="space-y-1">
                          {cocktail.specs.map((spec, idx) => (
                            <li
                              key={`${cocktail.id}-archived-spec-${idx}`}
                              className="rounded-md bg-slate-800/70 px-2 py-1"
                            >
                              <div className="flex items-center justify-between text-xs leading-5">
                                <span className="font-semibold text-slate-100">{spec.ingredient}</span>
                                <span className="font-extrabold text-blue-300">{spec.ml}ml</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {cocktail.serveExtras && (
                      <div className="mt-2 rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-300">Serve Extras</p>
                        <ul className="space-y-1">
                          {cocktail.serveExtras
                            .split(/[\n,]/)
                            .map((extra) => extra.trim())
                            .filter(Boolean)
                            .map((extra, idx) => (
                              <li
                                key={`${cocktail.id}-archived-extra-${idx}`}
                                className="rounded-md bg-slate-800/70 px-2 py-1"
                              >
                                <div className="flex items-center justify-between text-xs leading-5">
                                  <span className="font-semibold text-slate-100"></span>
                                  <span className="ml-2 font-extrabold text-blue-300">{extra}</span>
                                </div>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {cocktail.batchNote && (
                      <div className="mt-2 rounded-md bg-slate-900/70 p-2 shadow-inner ring-1 ring-slate-700/60 backdrop-blur-sm">
                        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-300">Batch Note</p>
                        <p className="whitespace-pre-line text-xs font-medium text-slate-300">{cocktail.batchNote}</p>
                      </div>
                    )}
                  </article>
                )})}
              </div>
            )
          )}
        </div>
      </section>
      )}
      </div>

      {/* Production Form Modal */}
      {showProductionForm && data && (
        <ProductionForm
          premixes={data.premixes.filter((p) => !p.isArchived).map(p => ({
            id: p.sourceCocktailId,
            name: p.name,
            batchYield: p.batchYieldBottles,
          }))}
          onSuccess={() => {
            setShowProductionForm(false);
            loadData();
          }}
          onCancel={() => setShowProductionForm(false)}
        />
      )}

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => {
            const tone =
              toast.kind === "success"
                ? "ring-emerald-500/45 bg-emerald-500/15 text-emerald-100"
                : toast.kind === "error"
                  ? "ring-rose-500/45 bg-rose-500/15 text-rose-100"
                  : "ring-blue-500/45 bg-blue-500/15 text-blue-100";

            return (
              <div
                key={toast.id}
                className={`pointer-events-auto rounded-2xl border border-white/10 px-4 py-3 shadow-2xl backdrop-blur-xl ring-1 ${tone}`}
              >
                <p className="text-sm font-semibold">{toast.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {showAddCocktailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-md">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-slate-700/70">
            <h2 className="mb-4 text-2xl font-extrabold text-white">Add Cocktail</h2>

            {addCocktailError && (
              <div className="mb-4 rounded-lg bg-red-900/30 p-3 text-sm font-semibold text-red-200 ring-1 ring-red-700">
                {addCocktailError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-300">Cocktail Name</label>
                  <input
                    type="text"
                    value={addCocktailForm.name}
                    onChange={(e) => setAddCocktailForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Naked and Famous"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-300">Category</label>
                  <select
                    value={addCocktailForm.category}
                    onChange={(e) => setAddCocktailForm((prev) => ({ ...prev, category: e.target.value as AddCocktailForm["category"] }))}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="SEASONAL">Seasonal</option>
                    <option value="SIGNATURE">Signature</option>
                    <option value="INGREDIENTS">Ingredients</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-300">Glassware</label>
                  <input
                    type="text"
                    value={addCocktailForm.glassware}
                    onChange={(e) => setAddCocktailForm((prev) => ({ ...prev, glassware: e.target.value }))}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Coupe"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-300">Garnish</label>
                  <input
                    type="text"
                    value={addCocktailForm.garnish}
                    onChange={(e) => setAddCocktailForm((prev) => ({ ...prev, garnish: e.target.value }))}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Lime twist"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-300">Technique</label>
                  <textarea
                    value={addCocktailForm.technique}
                    onChange={(e) => setAddCocktailForm((prev) => ({ ...prev, technique: e.target.value }))}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={2}
                    placeholder="e.g., Shake then fine strain"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-300">Straining</label>
                  <input
                    type="text"
                    value={addCocktailForm.straining}
                    onChange={(e) => setAddCocktailForm((prev) => ({ ...prev, straining: e.target.value }))}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Fine"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-300">Serve Extras</label>
                  <textarea
                    value={addCocktailForm.serveExtras}
                    onChange={(e) => setAddCocktailForm((prev) => ({ ...prev, serveExtras: e.target.value }))}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={2}
                    placeholder="Optional serve notes"
                  />
                </div>
                <div className="space-y-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={addCocktailForm.createPremix}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAddCocktailForm((prev) => ({
                          ...prev,
                          createPremix: checked,
                          isBatched: checked ? true : prev.isBatched,
                          premixRecipeItems:
                            checked && prev.premixRecipeItems.every((item) => item.ingredientName.trim().length === 0)
                              ? prev.specs
                                  .filter((s) => s.ingredient.trim().length > 0)
                                  .map((s) => ({ ingredientName: s.ingredient, amountPerBatch: Number(s.ml) || 0, unit: "parts" }))
                              : prev.premixRecipeItems,
                        }));
                      }}
                      className="peer sr-only"
                    />
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-500 bg-slate-900/80 shadow-inner transition-all duration-150 peer-checked:border-emerald-300 peer-checked:bg-emerald-500/25 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-300/70 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-slate-900">
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-3.5 w-3.5 text-emerald-100 opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                        aria-hidden="true"
                      >
                        <path
                          d="M4.5 10.5L8.5 14.5L15.5 6.5"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    Also add as premix
                  </label>
                  <p className="text-xs font-medium text-slate-400">
                    Turning this on will automatically mark the cocktail as batched.
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-300">Specs</label>
                  <button
                    onClick={() => setAddCocktailForm((prev) => ({
                      ...prev,
                      specs: [...prev.specs, { ingredient: "", ml: 0 }],
                    }))}
                    className="rounded bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-600"
                  >
                    + Line
                  </button>
                </div>
                <div className="space-y-2">
                  {addCocktailForm.specs.map((spec, idx) => (
                    <div key={`new-spec-${idx}`} className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto] gap-2">
                      <input
                        type="text"
                        value={spec.ingredient}
                        onChange={(e) => {
                          const specs = [...addCocktailForm.specs];
                          specs[idx] = { ...spec, ingredient: e.target.value };
                          setAddCocktailForm((prev) => ({ ...prev, specs }));
                        }}
                        placeholder="Ingredient"
                        className="min-w-0 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <input
                        type="number"
                        value={spec.ml}
                        onChange={(e) => {
                          const specs = [...addCocktailForm.specs];
                          specs[idx] = { ...spec, ml: Number(e.target.value) || 0 };
                          setAddCocktailForm((prev) => ({ ...prev, specs }));
                        }}
                        placeholder="ml"
                        step={0.01}
                        className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => {
                          if (addCocktailForm.specs.length <= 1) return;
                          const specs = addCocktailForm.specs.filter((_, i) => i !== idx);
                          setAddCocktailForm((prev) => ({ ...prev, specs }));
                        }}
                        className="h-10 w-10 rounded bg-red-700 text-xs font-semibold text-white hover:bg-red-600"
                        title="Remove line"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {addCocktailForm.createPremix && (
                <div className="space-y-3 rounded-xl bg-slate-800/60 p-4 ring-1 ring-slate-700">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-200">Premix Setup</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-300">Current Bottles</label>
                      <input
                        type="number"
                        value={addCocktailForm.premixCurrentBottles}
                        onChange={(e) => setAddCocktailForm((prev) => ({ ...prev, premixCurrentBottles: Number(e.target.value) || 0 }))}
                        step={0.01}
                        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-300">Threshold Bottles</label>
                      <input
                        type="number"
                        value={addCocktailForm.premixThresholdBottles}
                        onChange={(e) => setAddCocktailForm((prev) => ({ ...prev, premixThresholdBottles: Number(e.target.value) || 0 }))}
                        step={0.01}
                        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-300">Target Bottles</label>
                      <input
                        type="number"
                        value={addCocktailForm.premixTargetBottles}
                        onChange={(e) => setAddCocktailForm((prev) => ({ ...prev, premixTargetBottles: Number(e.target.value) || 0 }))}
                        step={0.01}
                        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">Premix Recipe Items</label>
                      <button
                        onClick={() => setAddCocktailForm((prev) => ({
                          ...prev,
                          premixRecipeItems: [...prev.premixRecipeItems, { ingredientName: "", amountPerBatch: 0, unit: "parts" }],
                        }))}
                        className="rounded bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-600"
                      >
                        + Line
                      </button>
                    </div>
                    <div className="space-y-2">
                      {addCocktailForm.premixRecipeItems.map((item, idx) => (
                        <div key={`new-premix-item-${idx}`} className="grid grid-cols-[minmax(0,1fr)_5rem_4.5rem_auto] gap-2">
                          <input
                            type="text"
                            value={item.ingredientName}
                            onChange={(e) => {
                              const premixRecipeItems = [...addCocktailForm.premixRecipeItems];
                              premixRecipeItems[idx] = { ...item, ingredientName: e.target.value };
                              setAddCocktailForm((prev) => ({ ...prev, premixRecipeItems }));
                            }}
                            placeholder="Ingredient"
                            className="min-w-0 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <input
                            type="number"
                            value={item.amountPerBatch}
                            onChange={(e) => {
                              const premixRecipeItems = [...addCocktailForm.premixRecipeItems];
                              premixRecipeItems[idx] = { ...item, amountPerBatch: Number(e.target.value) || 0 };
                              setAddCocktailForm((prev) => ({ ...prev, premixRecipeItems }));
                            }}
                            step={0.01}
                            placeholder="Amount"
                            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => {
                              const premixRecipeItems = [...addCocktailForm.premixRecipeItems];
                              premixRecipeItems[idx] = { ...item, unit: e.target.value };
                              setAddCocktailForm((prev) => ({ ...prev, premixRecipeItems }));
                            }}
                            placeholder="parts"
                            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            onClick={() => {
                              if (addCocktailForm.premixRecipeItems.length <= 1) return;
                              const premixRecipeItems = addCocktailForm.premixRecipeItems.filter((_, i) => i !== idx);
                              setAddCocktailForm((prev) => ({ ...prev, premixRecipeItems }));
                            }}
                            className="h-10 w-10 rounded bg-red-700 text-xs font-semibold text-white hover:bg-red-600"
                            title="Remove line"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-300">Premix Note</label>
                      <textarea
                        value={addCocktailForm.premixNote}
                        onChange={(e) => setAddCocktailForm((prev) => ({ ...prev, premixNote: e.target.value }))}
                        rows={2}
                        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-300">Batch Note</label>
                      <textarea
                        value={addCocktailForm.batchNote}
                        onChange={(e) => setAddCocktailForm((prev) => ({ ...prev, batchNote: e.target.value }))}
                        rows={2}
                        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={createCocktail}
                  disabled={addCocktailSaving}
                  className="flex-1 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                >
                  {addCocktailSaving ? "Creating..." : "Create Cocktail"}
                </button>
                <button
                  onClick={() => setShowAddCocktailModal(false)}
                  disabled={addCocktailSaving}
                  className="flex-1 rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Edit Cocktail Modal */}
        {editingCocktail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-md">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-slate-700/70">
              <h2 className="text-2xl font-extrabold text-white mb-4">Edit Cocktail Spec</h2>
              {editError && (
                <div className="mb-4 rounded-lg bg-red-900/30 p-3 text-sm font-semibold text-red-200 ring-1 ring-red-700">
                  {editError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingCocktail.name}
                    onChange={(e) => setEditingCocktail({...editingCocktail, name: e.target.value})}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={editingCocktail.category}
                    onChange={(e) => setEditingCocktail({...editingCocktail, category: e.target.value as any})}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="SEASONAL">Seasonal</option>
                    <option value="SIGNATURE">Signature</option>
                    <option value="INGREDIENTS">Ingredients</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Glassware</label>
                  <input
                    type="text"
                    value={editingCocktail.glassware || ""}
                    onChange={(e) => setEditingCocktail({...editingCocktail, glassware: e.target.value || null})}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Coupe glass"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Technique</label>
                  <textarea
                    value={editingCocktail.technique || ""}
                    onChange={(e) => setEditingCocktail({...editingCocktail, technique: e.target.value || null})}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Shake and strain"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Straining</label>
                  <input
                    type="text"
                    value={editingCocktail.straining || ""}
                    onChange={(e) => setEditingCocktail({...editingCocktail, straining: e.target.value || null})}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Fine strain"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Garnish</label>
                  <input
                    type="text"
                    value={editingCocktail.garnish || ""}
                    onChange={(e) => setEditingCocktail({...editingCocktail, garnish: e.target.value || null})}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Orange twist"
                  />
                </div>
                <label htmlFor="isBatched" className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    id="isBatched"
                    checked={editingCocktail.isBatched}
                    onChange={(e) => setEditingCocktail({...editingCocktail, isBatched: e.target.checked})}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-500 bg-slate-900/80 shadow-inner transition-all duration-150 peer-checked:border-blue-300 peer-checked:bg-blue-500/25 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-300/70 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-slate-900">
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-3.5 w-3.5 text-blue-100 opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                      aria-hidden="true"
                    >
                      <path
                        d="M4.5 10.5L8.5 14.5L15.5 6.5"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  Batched cocktail
                </label>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Serve Extras</label>
                  <textarea
                    value={editingCocktail.serveExtras || ""}
                    onChange={(e) => setEditingCocktail({...editingCocktail, serveExtras: e.target.value || null})}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Fresh mint sprig"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Premix Note</label>
                  <textarea
                    value={editingCocktail.premixNote || ""}
                    onChange={(e) => setEditingCocktail({...editingCocktail, premixNote: e.target.value || null})}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Notes about premix usage"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Batch Note</label>
                  <textarea
                    value={editingCocktail.batchNote || ""}
                    onChange={(e) => setEditingCocktail({...editingCocktail, batchNote: e.target.value || null})}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Notes about batch preparation"
                    rows={2}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveEditingCocktail}
                    disabled={editSaving}
                    className="flex-1 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                  >
                    {editSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setEditingCocktail(null)}
                    disabled={editSaving}
                    className="flex-1 rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-slate-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Premix Modal */}
        {editingPremix && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-md">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-slate-700/70">
              <h2 className="text-2xl font-extrabold text-white mb-4">Edit Premix</h2>
              {editError && (
                <div className="mb-4 rounded-lg bg-red-900/30 p-3 text-sm font-semibold text-red-200 ring-1 ring-red-700">
                  {editError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingPremix.name}
                    onChange={(e) => setEditingPremix({...editingPremix, name: e.target.value})}
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Current Bottles</label>
                    <input
                      type="number"
                      value={editingPremix.currentBottles}
                      onChange={(e) => setEditingPremix({...editingPremix, currentBottles: parseFloat(e.target.value) || 0})}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step={0.01}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Threshold Bottles</label>
                    <input
                      type="number"
                      value={editingPremix.thresholdBottles}
                      onChange={(e) => setEditingPremix({...editingPremix, thresholdBottles: parseFloat(e.target.value) || 0})}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step={0.01}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Target Bottles</label>
                    <input
                      type="number"
                      value={editingPremix.targetBottles}
                      onChange={(e) => setEditingPremix({...editingPremix, targetBottles: parseFloat(e.target.value) || 0})}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step={0.01}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1">Batch Yield Bottles</label>
                    <input
                      type="number"
                      value={editingPremix.batchYieldBottles}
                      onChange={(e) => setEditingPremix({...editingPremix, batchYieldBottles: parseFloat(e.target.value) || 0})}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step={0.01}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Recipe Items</label>
                  <div className="space-y-2">
                    {editingPremix.recipeItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-[minmax(0,1fr)_5rem_4.5rem_auto] items-end gap-2">
                        <input
                          type="text"
                          value={item.ingredientName}
                          onChange={(e) => {
                            const updated = [...editingPremix.recipeItems];
                            updated[idx] = {...item, ingredientName: e.target.value};
                            setEditingPremix({...editingPremix, recipeItems: updated});
                          }}
                          placeholder="Ingredient"
                          className="min-w-0 rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <input
                          type="number"
                          value={item.amountPerBatch}
                          onChange={(e) => {
                            const updated = [...editingPremix.recipeItems];
                            updated[idx] = {...item, amountPerBatch: parseFloat(e.target.value) || 0};
                            setEditingPremix({...editingPremix, recipeItems: updated});
                          }}
                          placeholder="Amount"
                          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          step={0.01}
                        />
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => {
                            const updated = [...editingPremix.recipeItems];
                            updated[idx] = {...item, unit: e.target.value};
                            setEditingPremix({...editingPremix, recipeItems: updated});
                          }}
                          placeholder="ml/g"
                          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <button
                          onClick={() => {
                            const updated = editingPremix.recipeItems.filter((_, i) => i !== idx);
                            setEditingPremix({...editingPremix, recipeItems: updated});
                          }}
                          className="h-10 w-10 rounded bg-red-700 text-xs font-semibold text-white hover:bg-red-600"
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveEditingPremix}
                    disabled={editSaving}
                    className="flex-1 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                  >
                    {editSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setEditingPremix(null)}
                    disabled={editSaving}
                    className="flex-1 rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-slate-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
