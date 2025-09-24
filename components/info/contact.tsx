export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="max-w-3xl text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">
            Contact
          </h1>
          <p className="text-[18px] text-gray-700 mb-8">
            For feedback or inquiries, please reach out through the following:
          </p>

          <div className="space-y-8 text-left">
            {/* First Contact */}
            <div>
              <h2 className="font-semibold text-[18px] text-gray-800">
                Ian Carl P. Cona
              </h2>
              <p className="text-[18px] text-gray-700">
                Email: iancarl.cona@msugensan.edu.ph
              </p>
              <p className="text-[18px] text-gray-700">
                Mindanao State University – General Santos
              </p>
              <p className="text-[18px] text-gray-700">
                Fatima, General Santos City, Philippines
              </p>
            </div>

            {/* Second Contact */}
            <div>
              <h2 className="font-semibold text-[18px] text-gray-800">
                Sophia Daphne C. Faelnar
              </h2>
              <p className="text-[18px] text-gray-700">
                Email: sophiadaphne.faelnar@msugensan.edu.ph
              </p>
              <p className="text-[18px] text-gray-700">
                Mindanao State University – General Santos
              </p>
              <p className="text-[18px] text-gray-700">
                Fatima, General Santos City, Philippines
              </p>
            </div>
          </div>
        </div>
      </main>


    </div>
  );
}
