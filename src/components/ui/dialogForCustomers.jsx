import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../../lib/utils";
import PropTypes from "prop-types";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogContent = React.forwardRef(
  ({ className, children, title, description, ...props }, ref) => (
    <DialogPortal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] border border-gray-700 bg-gray-900 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
          className
        )}
        {...props}
      >
        {/* Add DialogTitle with proper closing tag */}
        <DialogPrimitive.Title className="sr-only">
          {title || "Dialog"}
        </DialogPrimitive.Title>

        {/* Add DialogDescription with proper closing tag */}
        <DialogPrimitive.Description className="sr-only">
          {description || "Dialog content"}
        </DialogPrimitive.Description>

        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none disabled:pointer-events-none z-[51]">
          <div className="rounded-sm bg-gray-800 p-1 hover:bg-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-gray-300"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <span className="sr-only">Kapat</span>
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);
DialogContent.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
};

DialogContent.defaultProps = {
  className: "",
  title: "Dialog",
  description: "Dialog content",
};

DialogContent.displayName = DialogPrimitive.Content.displayName;

export { Dialog, DialogTrigger, DialogContent, DialogClose };
