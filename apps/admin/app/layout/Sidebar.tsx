import React from 'react'
import Link from 'next/link'

const menu = [
    {
        title: 'Dashboard',
        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
        link: '/',
    },
    {
        title: 'Master',
        icon: 'M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM9 3a2 2 0 00-2 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H9z',
        link: '/master',
    },
    {
        title: 'Emergency',
        icon: 'M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM9 3a2 2 0 00-2 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H9z',
        link: '/emergency',
    },
    {
        title: 'Users',
        icon: 'M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM9 3a2 2 0 00-2 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H9z',
        link: '/users',
    },
]

const Sidebar = () => {
    return (
        <aside
            className="z-40 w-64 h-screen border-r border-gray-100 transition-transform -translate-x-full sm:translate-x-0"
            aria-label="Sidebar"
        >
            <div className="h-full pt-[80px] px-3 py-4 overflow-y-auto bg-white">
                <ul className="space-y-2 font-medium">
                    {menu.map((item, index) => (
                        <li key={index}>
                            <Link
                                href={item.link}
                                className="flex items-center p-2 text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 group"
                            >
                                <svg
                                    className="w-5 h-5 text-gray-500 transition duration-75 group-hover:text-gray-900"
                                    aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="currentColor"
                                    viewBox="0 0 18 18"
                                >
                                    <path d={item.icon} />
                                </svg>
                                <span className="ml-3">{item.title}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
                <ul className="pt-4 mt-4 space-y-2 font-medium border-t border-gray-200">
                    <li>
                        <a
                            href="#"
                            className="flex items-center p-2 text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 group"
                        >
                            <svg
                                className="shrink-0 w-5 h-5 text-gray-500 transition duration-75  group-hover:text-gray-900"
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                viewBox="0 0 17 20"
                            >
                                <path d="M7.958 19.393a7.7 7.7 0 0 1-6.715-3.439c-2.868-4.832 0-9.376.944-10.654l.091-.122a3.286 3.286 0 0 0 .765-3.288A1 1 0 0 1 4.6.8c.133.1.313.212.525.347A10.451 10.451 0 0 1 10.6 9.3c.5-1.06.772-2.213.8-3.385a1 1 0 0 1 1.592-.758c1.636 1.205 4.638 6.081 2.019 10.441a8.177 8.177 0 0 1-7.053 3.795Z" />
                            </svg>
                            <span className="ms-3">Upgrade to Pro</span>
                        </a>
                    </li>
                    <li>
                        <a
                            href="#"
                            className="flex items-center p-2 text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100 group"
                        >
                            <svg
                                className="shrink-0 w-5 h-5 text-gray-500 transition duration-75 group-hover:text-gray-900"
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                                viewBox="0 0 16 20"
                            >
                                <path d="M16 14V2a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v15a3 3 0 0 0 3 3h12a1 1 0 0 0 0-2h-1v-2a2 2 0 0 0 2-2ZM4 2h2v12H4V2Zm8 16H3a1 1 0 0 1 0-2h9v2Z" />
                            </svg>
                            <span className="ms-3">Documentation</span>
                        </a>
                    </li>
                </ul>
            </div>
        </aside>
    )
}

export default Sidebar
