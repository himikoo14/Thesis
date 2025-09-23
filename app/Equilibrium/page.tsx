import Header from "../../components/Header";
import Footer from "../../components/Footer";


export default function Solver3D() {
    return (
        <main className="bg-gray-50 min-h-screen flex flex-col">
            < Header />
            {/* Page Content */}
            <section className="flex flex-col items-center text-center py-12 flex-grow">
                <h1 className="text-3xl md:text-4xl font-bold mb-10 text-black">
                    Equilibroom Calculator
                </h1>

                <div className="max-w-3xl w-full space-y-6 text-left">
                    {/* Force Setup */}
                    <div className="bg-white shadow rounded-xl p-6">
                        <h2 className="text-lg font-bold mb-2 text-black">Force setup</h2>
                        <p className="text-gray-600 text-sm mb-4">
                            Enter the number of forces, their magnitudes, and directions. Angles are measured from the positive x-axis.
                        </p>
                        <div className="space-y-4">
                            <input
                                type="number"
                                placeholder="Number of forces"
                                className="w-full border rounded-md px-3 py-2"
                            />
                            <input
                                type="text"
                                placeholder="Force 1"
                                className="w-full border rounded-md px-3 py-2"
                            />
                            <div className="grid grid-cols-3 gap-3">
                                <input type="number" placeholder="θx" className="border rounded-md px-3 py-2" />
                                <input type="number" placeholder="θy" className="border rounded-md px-3 py-2" />
                                <input type="number" placeholder="θz" className="border rounded-md px-3 py-2" />
                            </div>
                        </div>
                    </div>

                    {/* Free Body Diagram */}
                    <div className="bg-white shadow rounded-xl p-6">
                        <h2 className="text-lg font-bold mb-2 text-black">Free Body Diagram (FBD)</h2>
                        <div className="border border-dashed border-gray-400 rounded-md h-40 flex items-center justify-center text-gray-500">
                            Diagram Placeholder
                        </div>
                    </div>

                    {/* Resultant Force */}
                    <div className="bg-white shadow rounded-xl p-6">
                        <h2 className="text-lg font-bold mb-4 text-black">Resultant Force</h2>
                        <div className="space-y-3">
                            <input type="text" placeholder="Horizontal component" className="w-full border rounded-md px-3 py-2" />
                            <input type="text" placeholder="Vertical component" className="w-full border rounded-md px-3 py-2" />
                            <input type="text" placeholder="Magnitude of resultant force" className="w-full border rounded-md px-3 py-2" />
                            <input type="text" placeholder="Direction of resultant force" className="w-full border rounded-md px-3 py-2" />
                        </div>
                    </div>

                    {/* Solution */}
                    <div className="bg-white shadow rounded-xl p-6">
                        <h2 className="text-lg font-bold mb-2 text-black">Solution</h2>
                        <div className="text-gray-600 text-sm">
                            Step-by-step solution will appear here...
                        </div>
                    </div>
                </div>
            </section>

            < Footer />
        </main>
    );
}
