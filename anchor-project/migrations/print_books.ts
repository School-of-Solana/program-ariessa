import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";

async function main() {
  const rpc = process.env.SOLANA_RPC_URL || "http://127.0.0.1:8899";
  const connection = new anchor.web3.Connection(rpc, "confirmed");

  // read IDL that anchor build produced
  const idlPath = path.resolve(__dirname, "../target/idl/book.json");
  if (!fs.existsSync(idlPath))
    throw new Error(`IDL not found: ${idlPath}. run "anchor build".`);
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

  // provider: read-only dummy wallet
  const dummyWallet = {
    publicKey: anchor.web3.PublicKey.default,
    signTransaction: async () => {
      throw new Error("no wallet");
    },
    signAllTransactions: async () => {
      throw new Error("no wallet");
    },
  } as unknown as anchor.Wallet;

  const provider = new anchor.AnchorProvider(
    connection,
    dummyWallet,
    anchor.AnchorProvider.defaultOptions()
  );
  anchor.setProvider(provider);

  // resolve program id: prefer env vars, fallback to idl.metadata.address
  const pidString = "BoRFBZWJTzhHmKmR4VPHpWBXzi7odY23zwJT98u8CZvo";
  if (!pidString) {
    throw new Error(
      'Program id not specified. Set PROGRAM_ID or NEXT_PUBLIC_PROGRAM_ID env, or ensure "metadata.address" exists in target/idl/book.json'
    );
  }
  let programId: anchor.web3.PublicKey;
  try {
    programId = new anchor.web3.PublicKey(pidString);
  } catch (e) {
    throw new Error(`Invalid program id: ${pidString}`);
  }
  // The Program constructor expects (idl, provider) in this @coral-xyz/anchor version;
  // pass the provider as the second argument (programId is parsed above but not passed).
  const program = new anchor.Program(idl as any, provider);

  const accounts = await (program.account as any).book.all();
  if (accounts.length === 0) {
    console.log("No books found.");
    return;
  }

  const toNumber = (v: any) =>
    v && typeof v.toNumber === "function" ? v.toNumber() : v ?? null;
  for (const a of accounts) {
    const acc = a.account as any;
    const pubDate = toNumber(acc.publicationDate ?? acc.publication_date);
    const createdAt = toNumber(acc.createdAt ?? acc.created_at);
    console.log(
      "--------------------------------------------------------------------------------"
    );
    console.log("PDA:       ", a.publicKey.toBase58());
    console.log(
      "Owner:     ",
      acc.owner?.toBase58 ? acc.owner.toBase58() : acc.owner
    );
    console.log("Title:     ", acc.title);
    console.log("Author:    ", acc.author);
    console.log("ISBN:      ", acc.isbn);
    console.log("Genre:     ", acc.genre);
    console.log("Publisher: ", acc.publisher);
    console.log("Format:    ", acc.format_ ?? acc.format);
    console.log("Image:     ", acc.image);
    console.log(
      "Published: ",
      pubDate ? new Date(pubDate * 1000).toISOString() : "—"
    );
    console.log(
      "Created:   ",
      createdAt ? new Date(createdAt * 1000).toISOString() : "—"
    );
  }
  console.log(
    "--------------------------------------------------------------------------------"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
