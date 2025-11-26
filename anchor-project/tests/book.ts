import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Book } from "../target/types/book";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

describe("book program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Book as Program<Book>;
  const wallet = provider.wallet;

  const nowBn = () => new anchor.BN(Math.floor(Date.now() / 1000));
  const TEST_MAX_TITLE = 200;

  async function configPDA(): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("config")],
      program.programId
    );
  }

  async function bookPDA(isbn: string): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("book"), Buffer.from(isbn)],
      program.programId
    );
  }

  function accField(acc: any, ...keys: string[]) {
    for (const k of keys) {
      if (acc && Object.prototype.hasOwnProperty.call(acc, k)) return acc[k];
    }
    return undefined;
  }

  describe("initialize_config", () => {
    it("Can create config with authority as admin", async () => {
      const [cfg, _bump] = await configPDA();

      await program.methods
        .initializeConfig()
        .accounts({
          config: cfg,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const cfgAcc = await program.account.config.fetch(cfg);
      expect(cfgAcc.admin.toBase58()).to.equal(wallet.publicKey.toBase58());
    });

    it("Cannot initialize config twice", async () => {
      const [cfg, _bump] = await configPDA();

      try {
        await program.methods
          .initializeConfig()
          .accounts({
            config: cfg,
            authority: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("expected initializeConfig to fail when config exists");
      } catch (err: any) {
        const msg = (err?.toString() ?? "").toLowerCase();
        expect(msg).to.satisfy(
          (s: string) =>
            s.includes("already in use") ||
            s.includes("account") ||
            s.includes("exists")
        );
      }
    });
  });

  describe("create_book", () => {
    it("Admin can create book", async () => {
      const isbn = `ISBN-${Date.now()}`;
      const [cfg] = await configPDA();
      const [book] = await bookPDA(isbn);

      await program.methods
        .createBook(
          "Test Title",
          "Test Author",
          isbn,
          "https://example.com/img.jpg",
          "Test Publisher",
          nowBn(),
          "Paperback",
          "Fiction"
        )
        .accounts({
          book,
          config: cfg,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const acc = await program.account.book.fetch(book);

      // admin is canonical owner (stored in config)
      expect(acc.title).to.equal("Test Title");
      expect(acc.isbn).to.equal(isbn);
      expect(accField(acc, "format_", "format")).to.equal("Paperback");
      expect(acc.genre).to.equal("Fiction");
    });

    it("Admin cannot create book when title is too long", async () => {
      const longIsbn = `ISBN-LONG-${Date.now()}`;
      const [cfg] = await configPDA();
      const [book] = await bookPDA(longIsbn);

      const longTitle = "A".repeat(TEST_MAX_TITLE + 1);

      try {
        await program.methods
          .createBook(longTitle, "Author", longIsbn, "", "", nowBn(), "", "")
          .accounts({
            book,
            config: cfg,
            authority: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("expected createBook to fail with TitleTooLong");
      } catch (err: any) {
        const code = err?.error?.errorCode?.code ?? "";
        expect(code).to.equal("TitleTooLong");
      }
    });

    it("Non-admin cannot create book", async () => {
      const outsider = Keypair.generate();
      // fund outsider
      const sig = await provider.connection.requestAirdrop(
        outsider.publicKey,
        1e9
      );
      await provider.connection.confirmTransaction(sig);

      const outsiderIsbn = `ISBN-OUT-${Date.now()}`;
      const [cfg] = await configPDA();
      const [book] = await bookPDA(outsiderIsbn);

      try {
        await program.methods
          .createBook(
            "Outsider Book",
            "Hacker",
            outsiderIsbn,
            "",
            "",
            nowBn(),
            "",
            ""
          )
          .accounts({
            book,
            config: cfg,
            authority: outsider.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([outsider])
          .rpc();

        expect.fail("expected createBook to fail for non-admin");
      } catch (err: any) {
        const code = err?.error?.errorCode?.code ?? "";
        expect(code).to.equal("UnauthorizedCreator");
      }
    });
  });

  describe("update_genre", () => {
    let bookP: PublicKey;

    it("Admin can update book's genre", async () => {
      const isbn = `ISBN-UG-${Date.now()}`;
      const [cfg] = await configPDA();
      const [book] = await bookPDA(isbn);
      bookP = book;

      await program.methods
        .createBook("UG Title", "UG Author", isbn, "", "", nowBn(), "", "Old")
        .accounts({
          book,
          config: cfg,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .updateGenre("NewGenre")
        .accounts({
          book: bookP,
          authority: wallet.publicKey,
        })
        .rpc();

      const acc = await program.account.book.fetch(bookP);
      expect(acc.genre).to.equal("NewGenre");
    });

    it("Non-admin cannot update genre", async () => {
      const nonAdmin = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        nonAdmin.publicKey,
        1e9
      );
      await provider.connection.confirmTransaction(sig);

      const isbn = `ISBN-UG-${Date.now()}`;
      const [cfg] = await configPDA();
      const [book] = await bookPDA(isbn);
      bookP = book;

      await program.methods
        .createBook("UG Title", "UG Author", isbn, "", "", nowBn(), "", "Old")
        .accounts({
          book,
          config: cfg,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      try {
        await program.methods
          .updateGenre("BadUpdate")
          .accounts({
            book: bookP,
            authority: nonAdmin.publicKey,
          })
          .signers([nonAdmin])
          .rpc();

        expect.fail("expected updateGenre to fail for non-admin");
      } catch (err: any) {
        const code = err?.error?.errorCode?.code ?? "";
        expect(code).to.equal("Unauthorized");
      }
    });
  });

  describe("close_book", () => {
    let bookP: PublicKey;

    it("Admin can close book", async () => {
      const isbn = `ISBN-CLOSE-${Date.now()}`;
      const [cfg] = await configPDA();
      const [book] = await bookPDA(isbn);
      bookP = book;

      await program.methods
        .createBook(
          "Close Title",
          "Close Author",
          isbn,
          "",
          "",
          nowBn(),
          "",
          "Temp"
        )
        .accounts({
          book,
          config: cfg,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .closeBook()
        .accounts({
          book: bookP,
          authority: wallet.publicKey,
        })
        .rpc();

      try {
        await program.account.book.fetch(bookP);
        expect.fail("expected book account to be closed");
      } catch (err: any) {
        const msg = (err?.toString() ?? "").toLowerCase();
        expect(msg).to.satisfy(
          (s: string) =>
            s.includes("account") ||
            s.includes("does not exist") ||
            s.includes("not found")
        );
      }
    });

    it("Non-admin cannot close book", async () => {
      const isbn = `ISBN-CLOSE-${Date.now()}`;
      const [cfg] = await configPDA();
      const [book2] = await bookPDA(isbn);

      await program.methods
        .createBook("T", "A", isbn, "", "", nowBn(), "", "G")
        .accounts({
          book: book2,
          config: cfg,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const nonOwner = Keypair.generate();
      const sig = await provider.connection.requestAirdrop(
        nonOwner.publicKey,
        1e9
      );
      await provider.connection.confirmTransaction(sig);

      try {
        await program.methods
          .closeBook()
          .accounts({
            book: book2,
            authority: nonOwner.publicKey,
          })
          .signers([nonOwner])
          .rpc();

        expect.fail("expected closeBook to fail for non-admin");
      } catch (err: any) {
        const code = err?.error?.errorCode?.code ?? "";
        const msg = (
          err?.error?.errorMessage ??
          err?.toString() ??
          ""
        ).toLowerCase();
        expect(
          code === "Unauthorized" ||
            msg.includes("unauthorized") ||
            msg.includes("not owner") ||
            msg.includes("owner")
        ).to.be.true;
      }
    });
  });
});
