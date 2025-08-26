import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#181C23] text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-2">
              Oops! Something went wrong.
            </h2>
            <p className="text-gray-400">
              Please try refreshing the page or contact support.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
