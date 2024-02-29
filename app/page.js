"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

const Home = () => {
  const [data, setData] = useState({ links: [], scrapedData: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/api/postGet");
        setData(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Links</h1>
      <ul>
        {data.links.map((link, index) => (
          <li key={index}>{link}</li>
        ))}
      </ul>

      <h1>Scraped Data</h1>
      <ul>
        {data.scrapedData.map((post, index) => (
          <li key={index}>
            <h2>Title: {post.title}</h2>
            <p>Content: {post.content}</p>
            <p>ISO Date: {post.isoDate}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
