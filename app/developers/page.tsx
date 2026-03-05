"use client";

import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function DevelopersSection() {
  return (
    <>
      <Header />

      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 text-center space-y-14">
        <h1 className="text-4xl font-serif font-bold text-[#1848a0]">
          Developers
        </h1>

        {/* Developer 1 */}
        <DeveloperCard
          image="/ian.png"
          name="Ian Carl P. Coña"
          email="iancarl.cona@msugensan.edu.ph"
          facebook="facebook.com/Himiikoo14"
          roles={["Programmer", "Website Developer"]}
        />

        {/* Developer 2 */}
        <DeveloperCard
          image="/sophia.jpg"
          name="Sophia Daphne C. Faelnar"
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
      {/* Profile Image */}
      <div className="w-44 h-44 relative mb-4">
        <Image
          src={image}
          alt={name}
          fill
          className="rounded-full object-cover border-4 border-blue-600"
        />
      </div>

      {/* Name */}
      <h2 className="text-2xl font-serif font-bold text-[#1848a0]">
        {name}
      </h2>

      {/* Subtitle */}
      <p className="italic text-gray-600 mt-1">
        4th Year Civil Engineering Student, MSU-Gensan
      </p>

      {/* Roles */}
      <div className="mt-1 leading-tight">
        {roles.map((role, index) => (
          <p key={index} className="text-gray-700 text-sm">
            {role}
          </p>
        ))}
      </div>

      {/* Contact */}
      <div className="mt-3 space-y-1 text-gray-800">
        <div className="flex items-center justify-center gap-2">
          <span>✉</span>
          <span className="text-sm">{email}</span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span>f</span>
          <span className="text-sm">{facebook}</span>
        </div>
      </div>
    </div>
  );
}