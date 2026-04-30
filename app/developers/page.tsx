"use client";

import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function DevelopersSection() {
  return (
    <>
      <Header />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center py-10 text-center space-y-14">
        <h1 className="text-4xl font-serif font-bold text-[#1848a0]">
          Developers
        </h1>

        <DeveloperCard
          image="/ian.png"
          name="Ian Carl P. Coña, SO2"
          email="iancarl.cona@msugensan.edu.ph"
          facebook="facebook.com/Himiikoo14"
          roles={["Programmer", "Website Developer"]}
        />

        <DeveloperCard
          image="/sophia.jpg"
          name="Sophia Daphne C. Faelnar, SO2"
          email="sophiadaphne.faelnar@msugensan.edu.ph"
          facebook="facebook.com/piafaelnar"
          roles={["Web Designer", "Content Developer"]}
        />
      </div>

      <Footer />
    </>
  );
}

type Props = {
  image: string;
  name: string;
  email: string;
  facebook: string;
  roles: string[];
};

function DeveloperCard({ image, name, email, facebook, roles }: Props) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-44 h-44 relative mb-4">
        <Image
          src={image}
          alt={name}
          fill
          className="rounded-full object-cover border-4 border-blue-600"
        />
      </div>

      <h2 className="text-[20px] sm:text-[18px] font-serif font-bold text-[#1848a0]">
        {name}
      </h2>

      <p className="italic text-gray-600 dark:text-gray-400 mt-1 text-[14px] sm:text-[14px]">
        Bachelor of Science in Civil Engineering <br />Mindanao State University-General Santos
      </p>

      <div className="mt-1 leading-tight">
        {roles.map((role, index) => (
          <p key={index} className="text-gray-700 dark:text-gray-300 text-sm">
            {role}
          </p>
        ))}
      </div>

      <div className="mt-3 space-y-1 text-gray-800 dark:text-gray-300">
        <div className="flex items-center justify-center gap-2">
          <span>✉</span>
          <a href={`mailto:${email}`} className="text-sm text-[#1848a0] hover:underline">{email}</a>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span>f</span>
          <a href={`https://${facebook}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[#1848a0] hover:underline">{facebook}</a>
        </div>
      </div>
    </div>
  );
}