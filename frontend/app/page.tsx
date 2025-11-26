"use client";

import { useEffect, useState } from "react";
import { Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "../idl/book.json";
import Header from "../components/header";
import Footer from "../components/footer";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "http://127.0.0.1:8899";

function bnToNumber(bn: any): number | null {
  if (bn == null) return null;
  if (typeof bn === "number") return bn;
  if (typeof bn.toNumber === "function") return bn.toNumber();
  return Number(bn);
}

function toDateString(ts: any): string | null {
  const seconds = bnToNumber(ts);
  if (seconds === null) return null;
  const date = new Date(seconds * 1000);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

interface BookData {
  pubkey: string;
  owner: string;
  title: string;
  author: string;
  isbn: string;
  image: string;
  publisher: string;
  publicationDate: string | null;
  format: string;
  genre: string;
  createdAt: string | null;
}

function BookPlaceholderIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-10 w-10 text-gray-400"
    >
      <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
    </svg>
  );
}

function formatTitle(title: string): { main: string; subtitle: string | null } {
  const lastColonIndex = title.lastIndexOf(":");
  if (lastColonIndex === -1) {
    return { main: title, subtitle: null };
  }
  const main = title.slice(0, lastColonIndex).trim();
  const subtitle = title.slice(lastColonIndex + 1).trim();
  return { main, subtitle: subtitle || null };
}

function SkeletonCard() {
  return (
    <div className="flex h-[480px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Image placeholder */}
      <div className="flex h-44 shrink-0 items-center justify-center bg-gray-100 p-4">
        <div className="h-36 w-24 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <div className="h-16 shrink-0">
          <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Author */}
        <div className="h-5 shrink-0">
          <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Tags */}
        <div className="mt-3 flex min-h-7 shrink-0 gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
        </div>

        {/* Details */}
        <dl className="mt-auto space-y-1 pt-4 text-xs">
          <div className="flex justify-between">
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-10 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
          </div>
        </dl>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex justify-center">
          <div className="h-3 w-48 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <li key={i} className="h-full">
          <SkeletonCard />
        </li>
      ))}
    </ul>
  );
}

function BookCard({ book }: { book: BookData }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const solscanUrl = `https://solscan.io/account/${book.pubkey}?cluster=devnet`;
  const { main, subtitle } = formatTitle(book.title);

  return (
    <div
      className="h-[480px]"
      style={{
        perspective: "2000px",
        WebkitPerspective: "2000px",
      }}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          transition: "transform 0.5s ease-in-out",
          WebkitTransition: "-webkit-transform 0.5s ease-in-out",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          WebkitTransform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg) translateZ(1px)",
            WebkitTransform: "rotateY(0deg) translateZ(1px)",
          }}
        >
          {/* Fixed height image container - flip trigger */}
          <div
            className="flex h-44 shrink-0 cursor-pointer items-center justify-center bg-gray-100 p-4"
            onMouseEnter={() => setIsFlipped(true)}
          >
            {book.image ? (
              <img
                src={book.image}
                alt={`Cover of ${book.title}`}
                className="h-36 w-24 rounded object-cover shadow pointer-events-none"
              />
            ) : (
              <div className="flex h-36 w-24 items-center justify-center rounded bg-gray-200 pointer-events-none">
                <BookPlaceholderIcon />
              </div>
            )}
          </div>

          {/* Content area */}
          <div className="flex flex-1 flex-col p-4">
            {/* Title section */}
            <div className="h-16 shrink-0">
              <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                {main}
              </h3>
              {subtitle && (
                <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Author */}
            <p className="h-5 shrink-0 text-sm text-gray-600 line-clamp-1">
              by {book.author}
            </p>

            {/* Tags */}
            <div className="mt-3 flex min-h-7 shrink-0 flex-wrap gap-2">
              {book.genre && (
                <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {book.genre}
                </span>
              )}
              {book.format && (
                <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                  {book.format}
                </span>
              )}
            </div>

            {/* Details section */}
            <dl className="mt-auto pt-4 text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <dt>Publisher</dt>
                <dd className="font-medium text-gray-700 truncate max-w-[60%]">
                  {book.publisher || "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>ISBN</dt>
                <dd className="font-medium text-gray-700">
                  {book.isbn || "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Published</dt>
                <dd className="font-medium text-gray-700">
                  {book.publicationDate ?? "—"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2">
            <div className="flex items-center justify-center">
              <a
                href={solscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-gray-400 transition-colors hover:text-black"
                title="View on Solscan"
              >
                <span className="hidden sm:inline">
                  {book.pubkey.slice(0, 8)}...{book.pubkey.slice(-6)}
                </span>
                <span className="sm:hidden">{book.pubkey}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg) translateZ(1px)",
            WebkitTransform: "rotateY(180deg) translateZ(1px)",
          }}
        >
          {/* Book cover - larger display */}
          <div className="flex flex-1 items-center justify-center bg-linear-to-b from-gray-100 to-gray-50 p-4">
            {book.image ? (
              <img
                src={book.image}
                alt={`Cover of ${book.title}`}
                className="h-56 w-40 rounded-lg object-cover shadow-xl ring-1 ring-gray-200 pointer-events-none"
              />
            ) : (
              <div className="flex h-56 w-40 items-center justify-center rounded-lg bg-gray-200 shadow-xl pointer-events-none">
                <BookPlaceholderIcon />
              </div>
            )}
          </div>

          {/* Book info footer */}
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex flex-col items-center gap-1.5">
              <h3 className="max-h-16 overflow-y-auto text-center text-xs font-semibold leading-tight text-gray-900">
                {book.title}
              </h3>
              <p className="max-h-8 overflow-y-auto text-center text-[11px] leading-tight text-gray-500">
                {book.author}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Book icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-10 w-10 text-gray-400"
          >
            <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
          </svg>
        </div>

        {/* Message */}
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-gray-800">
            Nothing to show
          </h2>
          <p className="max-w-md text-sm text-gray-500">
            We couldn't load any books at the moment. Please try again later.
          </p>
        </div>

        {/* Decorative dots */}
        <div className="flex items-center gap-1.5 pt-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          <span className="h-1.5 w-1.5 rounded-full bg-gray-200" />
          <span className="h-1.5 w-1.5 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function fetchBooks() {
    try {
      setLoading(true);
      setError(false);
      const connection = new Connection(RPC, "confirmed");
      const provider = new anchor.AnchorProvider(connection, {} as any, {});
      const program = new anchor.Program(idl as anchor.Idl, provider);

      const raw = await (program.account as any).book.all();
      const parsed: BookData[] = raw.map((item: any) => ({
        pubkey: item.publicKey.toBase58(),
        title: item.account.title,
        author: item.account.author,
        isbn: item.account.isbn,
        publisher: item.account.publisher,
        genre: item.account.genre,
        format: item.account.format,
        publicationDate: toDateString(item.account.publicationDate),
        image: item.account.image,
      }));
      setBooks(parsed);
    } catch (err) {
      console.error("Failed to fetch books:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBooks();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error || books.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => (
              <BookCard key={book.pubkey} book={book} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
