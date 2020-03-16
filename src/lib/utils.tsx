import React from "react";
import { Tag } from "antd";
import "antd/dist/antd.css";

export const fallbackNone = (string: string) => {
    if (string) return string;
    else return <Tag color={"blue"}>{"<none>"}</Tag>;
};
