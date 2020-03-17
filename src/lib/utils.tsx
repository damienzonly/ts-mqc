import React from "react";
import { Tag, Button } from "antd";
import "antd/dist/antd.css";
import { ButtonProps } from "antd/lib/button";

export const fallbackNone = (string?: string) => {
    if (string) return string;
    else return <Tag color={"blue"}>{"<none>"}</Tag>;
};

export const createButton = (props: ButtonProps, content) => {
    return <Button {...props}>content</Button>;
};
