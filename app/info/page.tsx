import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";
import About from "<Ian>/components/info/about";
import References from "<Ian>/components/info/reference";
import Contacts from "<Ian>/components/info/contact";
import Developer from "<Ian>/components/info/developer";

export default function InfoPage() {
  return (
    <main className="h-screen flex flex-col bg-gray-50">
      {/* Fixed Header */}
      <Header />

      {/* Snap Scroll Sections */}
      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory">
        <section className="h-full snap-start flex items-center justify-center">
          <About />
        </section>
        <section className="h-full snap-start flex items-center justify-center">
          <References />
        </section>
        <section className="h-full snap-start flex items-center justify-center">
          <Contacts />
        </section>
        <section className="h-full snap-start flex items-center justify-center">
          <Developer />
        </section>
      </div>

      {/* Fixed Footer */}
      <Footer />
    </main>
  );
}
