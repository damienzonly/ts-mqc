import React from "react";
import { Table, Alert } from "antd";
import "antd/dist/antd.css";
import { OutputMessage_t } from "../types/App";
import Button, { ButtonProps } from "antd/lib/button";

export interface OutputDisplayProps {
    running: boolean;
    messages: OutputMessage_t[];
}

export class OutputDisplay extends React.Component<OutputDisplayProps> {
    render() {
        return (
                <Table
                    showHeader={this.props.running}
                    dataSource={this.props.messages}
                    pagination={false}
                    rowKey={"ts"}
                    columns={[
                        {
                            title: "Timestamp",
                            dataIndex: "ts",
                            render: ts => <Alert type="info" message={new Date(ts).toISOString()} />
                        },
                        {
                            title: "Topic",
                            dataIndex: "topic",
                            render: text => <Alert type="success" message={text} />
                        },
                        {
                            title: "Payload",
                            dataIndex: "payload",
                            render: text => <Alert style={{ whiteSpace: "pre-wrap" }} type={"error"} message={text} />
                        }
                    ]}
                />
        );
    }
}
