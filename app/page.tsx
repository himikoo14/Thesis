"use client";
import React, { useState } from 'react';

const Page = () => {
  const [value, setValue] = useState("");

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Calculator</h1>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type something..."
        className="border rounded p-2 w-full"
      />

      <p className="mt-3">You typed: {value}</p>
    </div>
  );
};

export default Page;
