import React from "react";
import { Connection_t, SelectConnectionMethod, DeleteConnectionMethod } from "../types/App";
import { Button, Table, Spin } from "antd";
import "antd/dist/antd.css";
import { buttonStyle } from "../style/app.style";
import { fallbackNone } from "../lib/utils";

export interface RecentConnectionsProps {
    selectConnection: SelectConnectionMethod;
    deleteConnection: DeleteConnectionMethod;
    open_modal_settings: () => void;
    open_modal_createConnection: () => void;
    close_modal_createConnection: () => void;
    start: () => void;
    stop: () => void;
    connections: Connection_t[];
    running: boolean;
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
                            <Button
                                disabled={this.props.running}
                                style={buttonStyle}
                                onClick={this.props.selectConnection(record, this.props.start)}
                                type={"primary"}
                            >
                                <i className={"fa fa-play"} />
                            </Button>
                            <Button
                                style={buttonStyle}
                                onClick={() => {
                                    this.props.selectConnection(record)();
                                    this.props.open_modal_createConnection();
                                }}
                                type={"primary"}
                            >
                                <i className={"fa fa-edit"} />
                            </Button>
                            <Button style={buttonStyle} onClick={this.props.deleteConnection(record)} type={"danger"}>
                                <i className="fa fa-trash" />
                            </Button>
                        </>
                    );
                }
            }
        ];
        return (
            <>
                <h2> Recent Connections </h2>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                        <Button style={buttonStyle} onClick={this.props.open_modal_createConnection} type={"primary"}>
                            <i className={"fa fa-edit"} />
                            &nbsp; Connection
                        </Button>
                        {this.props.running ? (
                            <Button type={"danger"} onClick={this.props.stop}>
                                Stop
                            </Button>
                        ) : null}
                        {this.props.running ? <Spin style={{ marginLeft: 10 }} /> : null}
                    </div>
                    <div>
                        <Button
                            style={{ ...buttonStyle, marginRight: 0 }}
                            onClick={this.props.open_modal_settings}
                            type={"primary"}
                        >
                            <i className={"fa fa-gears"} />
                            &nbsp; Settings
                        </Button>
                    </div>
                </div>
                <Table
                    rowKey={"uuid"}
                    size={"small"}
                    columns={recentConnectionsColumns}
                    dataSource={this.props.connections}
                ></Table>
            </>
        );
    }
}
