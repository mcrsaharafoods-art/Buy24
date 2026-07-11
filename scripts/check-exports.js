import * as start from "@tanstack/react-start";
import * as server from "@tanstack/start-server-core";

console.log("Start exports:", Object.keys(start).filter(k => k.toLowerCase().includes('cookie')));
console.log("Server exports:", Object.keys(server).filter(k => k.toLowerCase().includes('cookie')));
