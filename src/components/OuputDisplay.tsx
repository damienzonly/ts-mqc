import React from "react";
import { List, Alert } from "antd";
import "antd/dist/antd.css";
import { OutputMessage_t } from "../types/App";

export interface OutputDisplayProps {
    messages: OutputMessage_t[];
}

export class OutputDisplay extends React.Component<OutputDisplayProps> {
    render() {
        return (
            <List
                style={{ width: "100%" }}
                dataSource={this.props.messages}
                renderItem={(message: OutputMessage_t, i) => {
                    return (
                        <List.Item
                            key={message.payload + i}
                            style={{
                                whiteSpace: "pre-wrap",
                                display: "flex",
                                justifyContent: "space-between"
                            }}
                        >
                            <Alert type={"info"} message={new Date(message.ts).toISOString()} />
                            <Alert type={"success"} message={message.topic} />
                            <Alert type={"error"} message={message.payload} />
                        </List.Item>
                    );
                }}
            ></List>
        );
    }
}
