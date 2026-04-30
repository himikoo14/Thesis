import { useRouter } from "next/navigation";

export default function SurveyButton() {
  return (
    <button
      onClick={() => window.open("https://docs.google.com/forms/d/e/1FAIpQLSfvFkHs98DUzwh0qH3iplBqid4s6yeMcZjpkZwD1Om0AHSSbA/viewform", "_blank")}
      className="w-full bg-[#1848a0] text-white py-2.5 sm:py-3 rounded-lg hover:bg-[#163d8a] transition text-[15px] sm:text-[17px]"
    >
      📋 Take Our Survey
    </button>
  );
}