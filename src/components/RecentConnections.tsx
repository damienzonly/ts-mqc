import React from "react";
import { Connection_t, SelectConnectionMethod, DeleteConnectionMethod, VoidFunction } from "../types/App";
import { Button, Table, Spin } from "antd";
import "antd/dist/antd.css";
import { buttonStyle } from "../style/app.style";
import { fallbackNone, createButton } from "../lib/utils";
import { ButtonProps } from "antd/lib/button";

export interface RecentConnectionsProps {
    selectConnection: SelectConnectionMethod;
    deleteConnection: DeleteConnectionMethod;
    open_modal_settings: () => void;
    open_modal_connection: () => void;
    close_modal_connection: () => void;
    clearMessagesFunction: VoidFunction;
    start: () => void;
    stop: () => void;
    connections: Connection_t[];
    running: boolean;
}

export class RecentConnections extends React.Component<RecentConnectionsProps> {

    private table_render_topics = record => {
        const topics = Object.keys(record).join(", ");
        return topics.length ? topics : fallbackNone();
    }

    private table_render_play = (record: Connection_t) => {
        return (
            <Button
                disabled={this.props.running}
                onClick={this.props.selectConnection(record, this.props.start)}
                type={"primary"}
            >
                <i className={"fa fa-play"} />
            </Button>
        );
    }

    private table_render_select = record => {
        return (
            <Button
                onClick={() => {
                    this.props.selectConnection(record)();
                    this.props.open_modal_connection();
                }}
                type={"primary"}
            >
                <i className={"fa fa-edit"} />
            </Button>
        );
    }

    private table_render_delete = record => {
        return (
            <Button onClick={this.props.deleteConnection(record)} type={"danger"}>
                <i className="fa fa-trash" />
            </Button>
        );
    }

    render() {
        const recentConnectionsColumns = [
            { title: "Hostname", dataIndex: "connection_hostname", render: fallbackNone },
            { title: "Port", dataIndex: "connection_port", render: fallbackNone },
            { title: "Username", dataIndex: "connection_username", render: fallbackNone },
            { title: "Path", dataIndex: "connection_brokerPath", render: fallbackNone },
            { title: "Topics", dataIndex: "connection_topics", render: this.table_render_topics },
            { render: this.table_render_play },
            { render: this.table_render_select },
            { render: this.table_render_delete }
        ];

        const buttonProps_new: ButtonProps = {
            style: buttonStyle,
            onClick: this.props.open_modal_connection,
            type: "primary",
        }

        const buttonProps_stop: ButtonProps = {
            style: buttonStyle,
            onClick: this.props.stop,
            type: "danger",
        }

        const buttonProps_settings: ButtonProps = {
            style: { ...buttonStyle, marginRight: 0 },
            onClick: this.props.open_modal_settings,
            type: "primary",
        }

        const buttonProps_clearMessages: ButtonProps = {
            style: buttonStyle,
            onClick: this.props.clearMessagesFunction,
            type: "primary"
        }

        return (
            <>
                <h2> Recent Connections </h2>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                        <Button {...buttonProps_new}>
                            <i className={"fa fa-plus"} />
                            &nbsp; New
                        </Button>
                        {this.props.running ? createButton(buttonProps_stop, "Stop") : null}
                        {this.props.running ? <Spin style={{ marginLeft: 10 }} /> : null}
                    </div>
                    <div>
                        {createButton(buttonProps_clearMessages, "Clear Messages")}
                        <Button {...buttonProps_settings}>
                            <i className={"fa fa-gears"} />
                            &nbsp; Settings
                        </Button>
                    </div>
                </div>
                <Table
                    rowKey={"connection_uuid"}
                    size={"small"}
                    columns={recentConnectionsColumns}
                    dataSource={this.props.connections}
                ></Table>
            </>
        );
    }
}
