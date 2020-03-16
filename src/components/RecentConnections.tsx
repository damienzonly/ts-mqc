import React from "react";
import { Connection_t, SelectConnectionMethod, DeleteConnectionMethod } from "../types/App";
import { Button, Table } from "antd";
import "antd/dist/antd.css";
import { buttonStyle } from "../style/app.style";
import { fallbackNone } from "../lib/utils";

export interface RecentConnectionsProps {
    selectConnection: SelectConnectionMethod;
    deleteConnection: DeleteConnectionMethod;
    connections: Connection_t[];
    clearConnections: () => void;
}

export class RecentConnections extends React.Component<RecentConnectionsProps> {
    render() {
        const recentConnectionsColumns = [
            { title: "Hostname", dataIndex: "hostname", render: fallbackNone },
            { title: "Port", dataIndex: "port", render: fallbackNone },
            { title: "Username", dataIndex: "username", render: fallbackNone },
            { title: "Path", dataIndex: "brokerPath", render: fallbackNone },
            {
                title: "",
                render: (record: Connection_t) => {
                    return (
                        <>
                            <Button style={buttonStyle} onClick={this.props.selectConnection(record)} type={"primary"}>
                                Select
                            </Button>
                            <Button style={buttonStyle} onClick={this.props.deleteConnection(record)} type={"danger"}>
                                Delete
                            </Button>
                        </>
                    );
                }
            }
        ];
        return (
            <>
                <h2> Recent Connections </h2>
                <Button style={{ marginBottom: 10 }} type={"primary"} onClick={this.props.clearConnections}>
                    Clear
                </Button>
                <Table
                    style={{ minWidth: "30%" }}
                    rowKey={"uuid"}
                    size={"small"}
                    columns={recentConnectionsColumns}
                    dataSource={this.props.connections}
                ></Table>
            </>
        );
    }
}
