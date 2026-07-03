import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  clear: () => storage.clear(),
});

vi.stubGlobal("window", {
  openBook: {
    isElectron: true,
    saveDialog: vi.fn(),
    writePackage: vi.fn(),
    openDialog: vi.fn(),
    readPackage: vi.fn(),
  },
});

describe("saveBookToDisk", () => {
  beforeEach(async () => {
    storage.clear();
    vi.resetModules();
    window.openBook!.saveDialog = vi.fn().mockResolvedValue("/tmp/my-book.openbook");
    window.openBook!.writePackage = vi.fn().mockResolvedValue("/tmp/my-book.openbook");

    const { useBookStore } = await import("./book-store");
    useBookStore.setState({
      books: [],
      currentBookId: null,
      hydrated: false,
      saveStatus: "idle",
      saveError: null,
    });
  });

  it("persists packagePath after first save", async () => {
    const { useBookStore } = await import("./book-store");
    const { loadBooks } = await import("@/lib/storage");

    const bookId = useBookStore.getState().createBook("novel", "Test Book");
    const filePath = await useBookStore.getState().saveBookToDisk(bookId, false);

    expect(filePath).toBe("/tmp/my-book.openbook");
    const book = useBookStore.getState().books.find((b) => b.id === bookId);
    expect(book?.packagePath).toBe("/tmp/my-book.openbook");
    expect(loadBooks()[0]?.packagePath).toBe("/tmp/my-book.openbook");
  });

  it("keeps packagePath after subsequent edits", async () => {
    const { useBookStore } = await import("./book-store");
    const bookId = useBookStore.getState().createBook("novel", "Test Book");
    await useBookStore.getState().saveBookToDisk(bookId, false);
    const chapterId = useBookStore.getState().books[0]!.chapters[0]!.id;
    useBookStore.getState().updateChapter(bookId, chapterId, { content: "<p>edit</p>" });
    const book = useBookStore.getState().books.find((b) => b.id === bookId);
    expect(book?.packagePath).toBe("/tmp/my-book.openbook");
  });

  it("reuses packagePath on second save without dialog", async () => {
    const { useBookStore } = await import("./book-store");

    const bookId = useBookStore.getState().createBook("novel", "Test Book");
    await useBookStore.getState().saveBookToDisk(bookId, false);

    const saveDialog = window.openBook!.saveDialog as ReturnType<typeof vi.fn>;
    saveDialog.mockClear();

    await useBookStore.getState().saveBookToDisk(bookId, false);

    expect(saveDialog).not.toHaveBeenCalled();
    expect(window.openBook!.writePackage).toHaveBeenLastCalledWith(
      "/tmp/my-book.openbook",
      expect.any(ArrayBuffer)
    );
  });

  it("shows dialog for save as when packagePath exists", async () => {
    const { useBookStore } = await import("./book-store");

    const bookId = useBookStore.getState().createBook("novel", "Test Book");
    await useBookStore.getState().saveBookToDisk(bookId, false);

    const saveDialog = vi.fn().mockResolvedValue("/tmp/other-book.openbook");
    window.openBook!.saveDialog = saveDialog;

    await useBookStore.getState().saveBookToDisk(bookId, true);

    expect(saveDialog).toHaveBeenCalled();
  });

  it("does not overwrite in-memory packagePath on re-hydrate", async () => {
    const { useBookStore } = await import("./book-store");
    const { saveBooks, loadBooks } = await import("@/lib/storage");

    useBookStore.getState().hydrate();
    const bookId = useBookStore.getState().createBook("novel", "Test Book");
    await useBookStore.getState().saveBookToDisk(bookId, false);

    const stale = loadBooks().map((b) => ({ ...b, packagePath: undefined }));
    saveBooks(stale);

    useBookStore.getState().hydrate();
    const book = useBookStore.getState().books.find((b) => b.id === bookId);
    expect(book?.packagePath).toBe("/tmp/my-book.openbook");
  });

  it("does not set packagePath in browser download mode", async () => {
    vi.stubGlobal("document", {
      createElement: () => ({ click: vi.fn() }),
    });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("window", { openBook: undefined });
    vi.resetModules();

    const { useBookStore } = await import("./book-store");
    const bookId = useBookStore.getState().createBook("novel", "Test Book");
    const filePath = await useBookStore.getState().saveBookToDisk(bookId, false);

    expect(filePath).toBe("downloaded");
    const book = useBookStore.getState().books.find((b) => b.id === bookId);
    expect(book?.packagePath).toBeUndefined();

    vi.stubGlobal("window", {
      openBook: {
        isElectron: true,
        saveDialog: vi.fn().mockResolvedValue("/tmp/my-book.openbook"),
        writePackage: vi.fn().mockResolvedValue("/tmp/my-book.openbook"),
        openDialog: vi.fn(),
        readPackage: vi.fn(),
      },
    });
  });
});
