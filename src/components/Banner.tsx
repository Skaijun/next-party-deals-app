import { env } from "@/data/env/client";

export function Banner({
    message, mappings, customization, canRemoveBranding
}: {
    message: string;
    mappings: { country: string; coupon: string; discount: string; };
    customization: {
        backgroundColor: string;
        textColor: string;
        fontSize: string;
        isSticky: boolean;
        classPrefix?: string | null;
    };
    canRemoveBranding: boolean;
}) {
    const prefix = customization.classPrefix ?? "";
    const mappedMessage =
        Object.entries(mappings)
            .reduce(
                (mappedMessage, [key, value]) => {
                    return mappedMessage.replace(new RegExp(`{${key}}`, "g"), value)
                },
                message.replace(/'/g, "&#39;")
            );

    return (
        <>
            <style type="text/css">
                {`
                    .${prefix}easy-zzz-container {
                        all: revert;
                        display: flex;
                        flex-direction: column;
                        gap: .5em;
                        background-color: ${customization.backgroundColor};
                        color: ${customization.textColor};
                        font-size: ${customization.fontSize};
                        font-family: inherit;
                        padding: 1rem;
                        ${customization.isSticky ? "position: sticky;" : ""}
                        left: 0;
                        right: 0;
                        top: 0;
                        text-wrap: balance;
                        text-align: center;
                    }

                    .${prefix}easy-zzz-branding {
                        color: inherit;
                        font-size: inherit;
                        display: inline-block;
                        text-decoration: underline;
                    }
                 `}
            </style>

            <div
                className={`${prefix}easy-zzz-container ${prefix}easy-ppp-override`}
            >
                <span
                    className={`${prefix}easy-zzz-message ${prefix}easy-zzz-override`}
                    dangerouslySetInnerHTML={{ __html: mappedMessage }}
                />

                {!canRemoveBranding && (
                    <a
                        className={`${prefix}easy-zzz-branding`}
                        href={`${env.NEXT_PUBLIC_SERVER_URL}`}
                    >
                        Powered by Eazzy ZzZz
                    </a>
                )}

            </div></>
    );
}