"use client";
import Link from "next/link";
import { FaLinkedin, FaGithub } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bottom-0 left-0 z-20 w-full border-t border-gray-600 bg-zinc-950 p-4 shadow md:flex md:items-center md:justify-between md:p-6">
      <div className="flex flex-col text-sm text-gray-400">
        <span>© 2025 Eric Fang</span>
        <span>
          This project is not affiliated with Google. All data is used for
          non-commercial, educational purposes only.
        </span>
      </div>

      <ul className="mt-3 flex flex-wrap items-center text-sm font-medium text-gray-400 sm:mt-0">
        <li className="flex justify-items-center">
          <Link
            target="_blank"
            href="https://www.linkedin.com/in/eric-fang-aa46151b2/"
            className="me-4 hover:underline md:me-6"
          >
            <FaLinkedin />
          </Link>
        </li>
        <li className="flex justify-items-center">
          <Link
            target="_blank"
            href="https://github.com/ericf1"
            className="me-4 hover:underline md:me-6"
          >
            <FaGithub />
          </Link>
        </li>
      </ul>
    </footer>
  );
}
